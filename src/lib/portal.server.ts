// Server-only client-portal data layer (SuryaCine Supabase project).
import { useSession } from "@tanstack/react-start/server";
import { suryaAuth, suryaDb } from "./surya-supabase.server";
import type {
  ClientProfile,
  ProductionHouse,
  QuoteItem,
  QuotePayment,
  QuoteRequest,
  QuoteRequestDraft,
  QuoteStatus,
} from "./types";

const BUCKET = "prop-images";
const SIGNED_TTL = 60 * 60 * 24 * 7;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

type ClientSession = { userId?: string; email?: string };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "surya-client",
    maxAge: 60 * 60 * 24 * 14,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

async function session() {
  return useSession<ClientSession>(sessionConfig());
}

function clean(value: unknown, max = 400) {
  return String(value ?? "").trim().slice(0, max);
}

function num(value: unknown) {
  return Number(value ?? 0);
}

function days(from: string, to: string) {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 1;
  return Math.max(1, Math.round((b - a) / 86_400_000) || 1);
}

/* ---------- auth ---------- */

export async function currentClient() {
  const s = await session();
  if (!s.data.userId) return null;
  return { userId: s.data.userId, email: s.data.email ?? "" };
}

export async function requireClient() {
  const me = await currentClient();
  if (!me) throw new Error("Please sign in to your client portal.");
  return me;
}

export async function clientSignUp(input: {
  email: string;
  password: string;
  production_house: string;
  contact_person: string;
  phone: string;
  designation?: string;
}) {
  const email = clean(input.email, 200).toLowerCase();
  const password = String(input.password ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  const contact = clean(input.contact_person, 120);
  const phone = clean(input.phone, 24);
  if (!contact || !phone) throw new Error("Contact person and phone are required.");

  const { data, error } = await suryaDb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "client", contact_person: contact },
  });
  if (error || !data.user) {
    throw new Error(
      /already/i.test(error?.message ?? "")
        ? "An account with this email already exists — sign in instead."
        : (error?.message ?? "Could not create the account."),
    );
  }

  await suryaDb.from("client_profiles").upsert({
    user_id: data.user.id,
    email,
    production_house: clean(input.production_house, 160) || contact,
    contact_person: contact,
    phone,
    designation: clean(input.designation ?? "", 120),
  });

  const s = await session();
  await s.update({ userId: data.user.id, email });
  return { ok: true as const };
}

export async function clientSignIn(input: { email: string; password: string }) {
  const email = clean(input.email, 200).toLowerCase();
  const { data, error } = await suryaAuth.auth.signInWithPassword({
    email,
    password: String(input.password ?? ""),
  });
  if (error || !data.user) return { ok: false as const };
  await suryaAuth.auth.signOut();
  const s = await session();
  await s.update({ userId: data.user.id, email });
  return { ok: true as const };
}

export async function clientSignOut() {
  const s = await session();
  await s.clear();
  return { ok: true as const };
}

/* ---------- profile ---------- */

export async function getProfile(): Promise<ClientProfile> {
  const me = await requireClient();
  const { data } = await suryaDb
    .from("client_profiles")
    .select("*")
    .eq("user_id", me.userId)
    .maybeSingle();
  return {
    user_id: me.userId,
    email: (data?.["email"] as string) ?? me.email,
    production_house: (data?.["production_house"] as string) ?? "",
    contact_person: (data?.["contact_person"] as string) ?? "",
    phone: (data?.["phone"] as string) ?? "",
    designation: (data?.["designation"] as string) ?? "",
    address: (data?.["address"] as string) ?? "",
  };
}

export async function saveProfile(input: Partial<ClientProfile>) {
  const me = await requireClient();
  const { error } = await suryaDb.from("client_profiles").upsert({
    user_id: me.userId,
    email: me.email,
    production_house: clean(input.production_house, 160),
    contact_person: clean(input.contact_person, 120),
    phone: clean(input.phone, 24),
    designation: clean(input.designation, 120),
    address: clean(input.address, 400),
  });
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

/* ---------- production houses (shared, client-extensible banner list) ---------- */

export async function listProductionHouses(): Promise<ProductionHouse[]> {
  const { data, error } = await suryaDb
    .from("production_houses")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ id: Number(r.id), name: r.name as string }));
}

/** Select-or-create: returns the banner row, inserting it globally when new. */
async function resolveProductionHouse(name: string, userId: string) {
  const clean_name = clean(name, 160);
  if (!clean_name) throw new Error("Select or add the production house for this shoot.");
  const { data: existing } = await suryaDb
    .from("production_houses")
    .select("id, name")
    .ilike("name", clean_name)
    .maybeSingle();
  if (existing) return { id: Number(existing["id"]), name: existing["name"] as string };
  const { data, error } = await suryaDb
    .from("production_houses")
    .insert({ name: clean_name, created_by: userId })
    .select("id, name")
    .maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "Could not add the production house.");
  return { id: Number(data["id"]), name: data["name"] as string };
}

/* ---------- mapping ---------- */

async function signOne(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^(https?:)?\/\//.test(path)) return path;
  const { data } = await suryaDb.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl ?? null;
}

async function mapQuote(row: Record<string, any>): Promise<QuoteRequest> {
  return {
    id: Number(row["id"]),
    quote_code: row["quote_code"],
    user_id: row["user_id"],
    production_house: row["production_house"] ?? "",
    production_house_id:
      row["production_house_id"] == null ? null : Number(row["production_house_id"]),
    movie_name: row["movie_name"] ?? "",
    client_designation: row["client_designation"] ?? "",
    contact_person: row["contact_person"] ?? "",
    phone: row["phone"] ?? "",
    shoot_location: row["shoot_location"] ?? "",
    shoot_start_date: row["shoot_start_date"],
    estimated_return_date: row["estimated_return_date"],
    estimated_days: Number(row["estimated_days"] ?? 1),
    actual_return_date: row["actual_return_date"] ?? null,
    actual_days_used: row["actual_days_used"] == null ? null : Number(row["actual_days_used"]),
    items: (row["items"] ?? []) as QuoteItem[],
    estimated_total: num(row["estimated_total"]),
    security_deposit: num(row["security_deposit"]),
    advance_required: num(row["advance_required"]),
    advance_paid: num(row["advance_paid"]),
    final_total: num(row["final_total"]),
    balance_due: num(row["balance_due"]),
    status: row["status"] as QuoteStatus,
    payment_reference: row["payment_reference"] ?? null,
    payment_proof_url: await signOne(row["payment_proof_path"] ?? null),
    admin_notes: row["admin_notes"] ?? null,
    client_notes: row["client_notes"] ?? null,
    created_at: row["created_at"],
  };
}

/* ---------- stage 1: client requests a quote ---------- */

export async function createQuoteRequest(draft: QuoteRequestDraft) {
  const me = await requireClient();
  const ids = (draft.items ?? []).map((i) => Number(i.prop_id)).filter(Boolean);
  if (ids.length === 0) throw new Error("Add at least one prop to your shoot wishlist.");
  if (!draft.shoot_start_date || !draft.estimated_return_date) {
    throw new Error("Shoot start and estimated return dates are required.");
  }

  const profile = await getProfile();
  const banner = await resolveProductionHouse(draft.production_house, me.userId);
  const movie_name = clean(draft.movie_name, 160);
  if (!movie_name) throw new Error("Movie / project name is required.");
  const [{ data: props, error }, { data: godowns }, { data: racks }] = await Promise.all([
    suryaDb
      .from("props")
      .select("id, title, serial_number, description_specs, godown_id, rack_id")
      .in("id", ids),
    suryaDb.from("godowns").select("id, name"),
    suryaDb.from("racks").select("id, rack_name"),
  ]);
  if (error) throw new Error(error.message);
  const gMap = new Map((godowns ?? []).map((g: any) => [Number(g.id), g.name as string]));
  const rMap = new Map((racks ?? []).map((r: any) => [Number(r.id), r.rack_name as string]));

  const items: QuoteItem[] = (props ?? []).map((p: any) => {
    const line = draft.items.find((i) => Number(i.prop_id) === Number(p.id));
    return {
      prop_id: Number(p.id),
      prop_name: p.title,
      prop_specs: p.description_specs ?? "",
      serial_number: p.serial_number ?? "",
      godown_name: gMap.get(Number(p.godown_id)) ?? "",
      rack_name: rMap.get(Number(p.rack_id)) ?? "",
      quantity: Math.max(1, Math.min(99, Number(line?.quantity ?? 1))),
      daily_rate: 0,
      line_total: 0,
    };
  });
  if (items.length === 0) throw new Error("None of the selected props are available.");

  const quote_code = `SCP-Q-${Date.now().toString().slice(-6)}`;
  const { data: saved, error: insErr } = await suryaDb
    .from("quote_requests")
    .insert({
      quote_code,
      user_id: me.userId,
      production_house: banner.name,
      production_house_id: banner.id,
      movie_name,
      client_designation: profile.designation,
      contact_person: profile.contact_person,
      phone: profile.phone,
      shoot_location: clean(draft.shoot_location, 240),
      shoot_start_date: draft.shoot_start_date,
      estimated_return_date: draft.estimated_return_date,
      estimated_days: days(draft.shoot_start_date, draft.estimated_return_date),
      items: items as unknown as any,
      client_notes: draft.client_notes ? clean(draft.client_notes, 1000) : null,
      status: "quote_requested",
    })
    .select("*")
    .single();
  if (insErr || !saved) {
    throw new Error(insErr?.message ?? "The quote request could not be saved.");
  }

  // Return the persisted lifecycle record, not a detached summary. The client
  // can render this exact row immediately while WhatsApp uses the same data.
  return mapQuote(saved as Record<string, any>);
}

export async function listMyQuotes(): Promise<QuoteRequest[]> {
  const me = await requireClient();
  const { data, error } = await suryaDb
    .from("quote_requests")
    .select("*")
    .eq("user_id", me.userId)
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return Promise.all((data ?? []).map((r) => mapQuote(r as Record<string, any>)));
}

export async function listMyPayments(): Promise<QuotePayment[]> {
  const me = await requireClient();
  const { data, error } = await suryaDb
    .from("quote_payments")
    .select("*")
    .eq("user_id", me.userId)
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p: Record<string, any>) => ({
    id: Number(p["id"]),
    quote_id: Number(p["quote_id"]),
    kind: p["kind"],
    amount: num(p["amount"]),
    reference: p["reference"] ?? "",
    status: p["status"],
    created_at: p["created_at"],
  }));
}

/* ---------- stage 3: client accepts + submits advance ---------- */

export async function uploadPaymentProof(fileName: string, contentType: string, base64: string) {
  await requireClient();
  if (!/^image\/(png|jpe?g|webp|heic|heif)$/i.test(contentType)) {
    throw new Error("Upload a PNG or JPG screenshot of the payment.");
  }
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error("Image is larger than 8 MB.");
  const safe = clean(fileName, 80).replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `payments/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  const { error } = await suryaDb.storage.from(BUCKET).upload(path, bytes, { contentType });
  if (error) throw new Error(error.message);
  return { path };
}

export async function acceptQuote(input: {
  id: number;
  payment_reference: string;
  payment_proof_path?: string | null;
}) {
  const me = await requireClient();
  const reference = clean(input.payment_reference, 120);
  if (!reference) throw new Error("Enter the UPI / transaction reference.");

  const { data: quote, error } = await suryaDb
    .from("quote_requests")
    .select("*")
    .eq("id", Number(input.id))
    .eq("user_id", me.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) throw new Error("Quotation not found.");
  if (quote["status"] !== "quote_sent") throw new Error("This quotation is not awaiting payment.");

  const { error: upErr } = await suryaDb
    .from("quote_requests")
    .update({
      status: "advance_submitted",
      payment_reference: reference,
      payment_proof_path: input.payment_proof_path ? clean(input.payment_proof_path, 300) : null,
    })
    .eq("id", Number(input.id))
    .eq("user_id", me.userId);
  if (upErr) throw new Error(upErr.message);

  await suryaDb.from("quote_payments").insert({
    quote_id: Number(input.id),
    user_id: me.userId,
    kind: "advance",
    amount: num(quote["advance_required"]),
    reference,
    status: "pending",
  });
  return { ok: true as const };
}

export async function rejectQuoteByClient(id: number) {
  const me = await requireClient();
  const { error } = await suryaDb
    .from("quote_requests")
    .update({ status: "rejected" })
    .eq("id", Number(id))
    .eq("user_id", me.userId);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

/* ---------- admin side ---------- */

export async function listAllQuotes(): Promise<QuoteRequest[]> {
  const { data, error } = await suryaDb
    .from("quote_requests")
    .select("*")
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return Promise.all((data ?? []).map((r) => mapQuote(r as Record<string, any>)));
}

/** Stage 2 — admin prices each line, sets advance + deposit, sends the quotation. */
export async function priceQuote(input: {
  id: number;
  items: { prop_id: number; daily_rate: number; quantity: number }[];
  security_deposit: number;
  advance_required: number;
  estimated_days: number;
  admin_notes?: string;
}) {
  const { data: quote, error } = await suryaDb
    .from("quote_requests")
    .select("*")
    .eq("id", Number(input.id))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) throw new Error("Quotation not found.");

  const estimated_days = Math.max(1, Number(input.estimated_days ?? quote["estimated_days"] ?? 1));
  const items: QuoteItem[] = ((quote["items"] ?? []) as QuoteItem[]).map((item) => {
    const patch = input.items.find((i) => Number(i.prop_id) === item.prop_id);
    const daily_rate = Math.max(0, Number(patch?.daily_rate ?? item.daily_rate ?? 0));
    const quantity = Math.max(1, Number(patch?.quantity ?? item.quantity ?? 1));
    return { ...item, daily_rate, quantity, line_total: daily_rate * quantity * estimated_days };
  });
  const estimated_total = items.reduce((s, i) => s + i.line_total, 0);
  const security_deposit = Math.max(0, Number(input.security_deposit ?? 0));
  const advance_required = Math.max(0, Number(input.advance_required ?? 0));

  const { error: upErr } = await suryaDb
    .from("quote_requests")
    .update({
      items: items as unknown as any,
      estimated_days,
      estimated_total,
      security_deposit,
      advance_required,
      final_total: estimated_total,
      balance_due: estimated_total + security_deposit - advance_required,
      admin_notes: input.admin_notes ? clean(input.admin_notes, 1000) : null,
      status: "quote_sent",
    })
    .eq("id", Number(input.id));
  if (upErr) throw new Error(upErr.message);
  return { ok: true as const };
}

/** Stage 3b — admin confirms the advance actually landed (UPI reference / proof). */
export async function verifyAdvance(id: number) {
  const { data: quote, error } = await suryaDb
    .from("quote_requests")
    .select("*")
    .eq("id", Number(id))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) throw new Error("Quotation not found.");

  const advance = num(quote["advance_required"]);
  const { error: upErr } = await suryaDb
    .from("quote_requests")
    .update({
      status: "payment_received",
      advance_paid: advance,
      balance_due: num(quote["estimated_total"]) + num(quote["security_deposit"]) - advance,
    })
    .eq("id", Number(id));
  if (upErr) throw new Error(upErr.message);

  await suryaDb
    .from("quote_payments")
    .update({ status: "verified" })
    .eq("quote_id", Number(id))
    .eq("kind", "advance");

  return { ok: true as const };
}

/** Stage 3c — props physically dispatched: rent starts, inventory locks. */
export async function dispatchQuote(id: number) {
  const { data: quote, error } = await suryaDb
    .from("quote_requests")
    .select("*")
    .eq("id", Number(id))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) throw new Error("Quotation not found.");
  if (!["payment_received", "on_set"].includes(quote["status"])) {
    throw new Error("Confirm the advance payment before dispatching the props.");
  }

  const { error: upErr } = await suryaDb
    .from("quote_requests")
    .update({ status: "dispatched" })
    .eq("id", Number(id));
  if (upErr) throw new Error(upErr.message);

  const propIds = ((quote["items"] ?? []) as QuoteItem[]).map((i) => i.prop_id);
  if (propIds.length > 0) {
    await suryaDb.from("props").update({ status: "On-Set" }).in("id", propIds);
  }
  return { ok: true as const };
}

/** Stage 4 — record return, recompute on actual days used, release inventory. */
export async function recordReturn(input: { id: number; actual_return_date: string }) {
  const { data: quote, error } = await suryaDb
    .from("quote_requests")
    .select("*")
    .eq("id", Number(input.id))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) throw new Error("Quotation not found.");
  if (!input.actual_return_date) throw new Error("Actual return date is required.");

  const actual_days_used = days(quote["shoot_start_date"], input.actual_return_date);
  const items: QuoteItem[] = ((quote["items"] ?? []) as QuoteItem[]).map((i) => ({
    ...i,
    line_total: i.daily_rate * i.quantity * actual_days_used,
  }));
  const final_total = items.reduce((s, i) => s + i.line_total, 0);
  const advance_paid = num(quote["advance_paid"]);
  const balance_due = final_total + num(quote["security_deposit"]) - advance_paid;

  const { error: upErr } = await suryaDb
    .from("quote_requests")
    .update({
      items: items as unknown as any,
      actual_return_date: input.actual_return_date,
      actual_days_used,
      final_total,
      balance_due,
      status: "settled",
    })
    .eq("id", Number(input.id));
  if (upErr) throw new Error(upErr.message);

  await suryaDb.from("quote_payments").insert({
    quote_id: Number(input.id),
    user_id: quote["user_id"],
    kind: "settlement",
    amount: balance_due,
    reference: `Final settlement · ${actual_days_used} day(s) used`,
    status: "pending",
  });

  const propIds = items.map((i) => i.prop_id);
  if (propIds.length > 0) {
    await suryaDb.from("props").update({ status: "In-Stock" }).in("id", propIds);
  }
  return { ok: true as const, actual_days_used, final_total, balance_due };
}
