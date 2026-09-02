// Server-only client-portal data layer (SuryaCine Supabase project).
import { useSession } from "@tanstack/react-start/server";
import { suryaAuth, suryaDb } from "./surya-supabase.server";
import type {
  ClientAccountSummary,
  ClientDossier,
  Invoice,
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

/* ---------- crew & labour sidecar ----------
 * The live database has not been upgraded with the Phase 3 columns
 * (crew_assignments, labour_days, settled_amount …). Until it is, this state is
 * persisted as a JSON payload on a dedicated `dispatch_logs` row per order
 * (kind = 'crew_labour'), which keeps every crew / labour feature working
 * without any schema change.
 */

const SIDECAR_KIND = "crew_labour";

type Phase3State = {
  crew_assignments: QuoteRequest["crew_assignments"];
  labour_days: QuoteRequest["labour_days"];
  labour_total: number;
  labour_settled_amount: number;
  labour_status: "pending" | "closed";
  labour_cleared_at: string | null;
  labour_invoice_no: string | null;
  settled_amount: number;
  settlement_waived: number;
  shoot_days: QuoteRequest["shoot_days"];
};

async function readSidecar(quoteId: number): Promise<Partial<Phase3State>> {
  const { data } = await suryaDb
    .from("dispatch_logs")
    .select("id, notes")
    .eq("quote_id", quoteId)
    .eq("kind", SIDECAR_KIND)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.["notes"]) return {};
  try {
    return JSON.parse(String(data["notes"])) as Partial<Phase3State>;
  } catch {
    return {};
  }
}

async function writeSidecar(quoteId: number, patch: Partial<Phase3State>) {
  const { data } = await suryaDb
    .from("dispatch_logs")
    .select("id, notes")
    .eq("quote_id", quoteId)
    .eq("kind", SIDECAR_KIND)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  let current: Partial<Phase3State> = {};
  if (data?.["notes"]) {
    try {
      current = JSON.parse(String(data["notes"])) as Partial<Phase3State>;
    } catch {
      current = {};
    }
  }
  const notes = JSON.stringify({ ...current, ...patch });
  if (data?.["id"]) {
    const { error } = await suryaDb
      .from("dispatch_logs")
      .update({ notes })
      .eq("id", Number(data["id"]));
    if (error) throw new Error(error.message);
  } else {
    const { data: q } = await suryaDb
      .from("quote_requests")
      .select("quote_code")
      .eq("id", quoteId)
      .maybeSingle();
    const { error } = await suryaDb.from("dispatch_logs").insert({
      quote_id: quoteId,
      quote_code: (q?.["quote_code"] as string) ?? "",
      kind: SIDECAR_KIND,
      vehicle_number: "",
      notes,
      staff_name: "system",
    });
    if (error) throw new Error(error.message);
  }
  return { ...current, ...patch };
}

/* ---------- mapping ---------- */

async function signOne(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^(https?:)?\/\//.test(path)) return path;
  const { data } = await suryaDb.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl ?? null;
}


async function mapQuote(row: Record<string, any>): Promise<QuoteRequest> {
  const side = await readSidecar(Number(row["id"]));
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
    accepted_at: row["accepted_at"] ?? null,
    advance_receipt_no: row["advance_receipt_no"] ?? null,
    advance_mode: row["advance_mode"] ?? null,
    advance_utr: row["advance_utr"] ?? null,
    advance_verified_at: row["advance_verified_at"] ?? null,
    dispatch_at: row["dispatch_at"] ?? null,
    dispatch_vehicle: row["dispatch_vehicle"] ?? null,
    dispatch_notes: row["dispatch_notes"] ?? null,
    balance_cleared_at: row["balance_cleared_at"] ?? null,
    crew_assignments: (row["crew_assignments"] ??
      side.crew_assignments ??
      []) as QuoteRequest["crew_assignments"],
    labour_days: (row["labour_days"] ?? side.labour_days ?? []) as QuoteRequest["labour_days"],
    labour_total: num(row["labour_total"] ?? side.labour_total),
    labour_settled_amount: num(row["labour_settled_amount"] ?? side.labour_settled_amount),
    labour_status: (row["labour_status"] ?? side.labour_status ?? "pending") as
      | "pending"
      | "closed",
    labour_cleared_at: row["labour_cleared_at"] ?? side.labour_cleared_at ?? null,
    labour_invoice_no: row["labour_invoice_no"] ?? side.labour_invoice_no ?? null,
    settled_amount: num(row["settled_amount"] ?? side.settled_amount),
    settlement_waived: num(row["settlement_waived"] ?? side.settlement_waived),
    shoot_days: (side.shoot_days ?? []) as QuoteRequest["shoot_days"],

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

/** Stage 2b — client accepts the quotation; the Advance Payment Request is issued. */
export async function acceptQuotation(id: number) {
  const me = await requireClient();
  const { data: quote, error } = await suryaDb
    .from("quote_requests")
    .select("status")
    .eq("id", Number(id))
    .eq("user_id", me.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) throw new Error("Quotation not found.");
  if (quote["status"] !== "quote_sent") throw new Error("This quotation cannot be accepted now.");

  const { error: upErr } = await suryaDb
    .from("quote_requests")
    .update({ status: "quote_accepted", accepted_at: new Date().toISOString() })
    .eq("id", Number(id))
    .eq("user_id", me.userId);
  if (upErr) throw new Error(upErr.message);
  return { ok: true as const };
}

export async function acceptQuote(input: {
  id: number;
  payment_reference: string;
  payment_proof_path?: string | null;
  payment_mode?: string;
}) {
  const me = await requireClient();
  const reference = clean(input.payment_reference, 120);
  if (!reference) throw new Error("Enter the UPI / transaction reference (UTR).");

  const { data: quote, error } = await suryaDb
    .from("quote_requests")
    .select("*")
    .eq("id", Number(input.id))
    .eq("user_id", me.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) throw new Error("Quotation not found.");
  if (!["quote_sent", "quote_accepted"].includes(quote["status"])) {
    throw new Error("This quotation is not awaiting payment.");
  }

  const mode = clean(input.payment_mode ?? "UPI", 24) || "UPI";
  const { error: upErr } = await suryaDb
    .from("quote_requests")
    .update({
      status: "advance_submitted",
      payment_reference: reference,
      advance_utr: reference,
      advance_mode: mode,
      accepted_at: quote["accepted_at"] ?? new Date().toISOString(),
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
    reference: `${mode} · ${reference}`,
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

/**
 * Stage 2b (offline) — the client confirmed the quotation over a phone call or a
 * WhatsApp message, so the admin / manager accepts it on their behalf and records
 * a remark of how the confirmation came in.
 */
export async function adminAcceptQuotation(input: {
  id: number;
  remark: string;
  channel?: string;
}) {
  const id = Number(input.id);
  const remark = clean(input.remark, 500);
  if (!remark) throw new Error("Add a remark describing how the client confirmed.");
  const channel = clean(input.channel ?? "Phone call", 40) || "Phone call";

  const { data: quote, error } = await suryaDb
    .from("quote_requests")
    .select("status, admin_notes")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) throw new Error("Quotation not found.");
  if (quote["status"] !== "quote_sent") {
    throw new Error("Only a sent quotation awaiting acceptance can be accepted manually.");
  }

  const stamp = new Date().toISOString();
  const trail = `[${stamp.slice(0, 10)}] Accepted manually via ${channel}: ${remark}`;
  const admin_notes = [quote["admin_notes"], trail].filter(Boolean).join("\n");

  const { error: upErr } = await suryaDb
    .from("quote_requests")
    .update({ status: "quote_accepted", accepted_at: stamp, admin_notes })
    .eq("id", id);
  if (upErr) throw new Error(upErr.message);
  return { ok: true as const };
}

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

/**
 * Admin can revise the advance ask at any point before dispatch — including
 * setting it to ₹0 so the shoot can proceed with no advance at all.
 */
export async function setAdvanceRequired(input: { id: number; advance_required: number }) {
  const id = Number(input.id);
  const { data: quote, error } = await suryaDb
    .from("quote_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) throw new Error("Quotation not found.");
  if (["dispatched", "on_set", "settled", "closed"].includes(quote["status"])) {
    throw new Error("The advance cannot be revised after dispatch.");
  }

  const advance_required = Math.max(0, Number(input.advance_required ?? 0));
  const { error: upErr } = await suryaDb
    .from("quote_requests")
    .update({
      advance_required,
      balance_due:
        num(quote["estimated_total"]) + num(quote["security_deposit"]) - advance_required,
    })
    .eq("id", id);
  if (upErr) throw new Error(upErr.message);

  await suryaDb
    .from("quote_payments")
    .update({ amount: advance_required })
    .eq("quote_id", id)
    .eq("kind", "advance")
    .eq("status", "pending");

  return { ok: true as const, advance_required };
}



/** Stage 3b — admin confirms the advance landed; the Advance Money Receipt is issued. */
export async function verifyAdvance(input: {
  id: number;
  amount_received?: number;
  mode?: string;
  utr?: string;
}) {
  const id = Number(input.id);
  const { data: quote, error } = await suryaDb
    .from("quote_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) throw new Error("Quotation not found.");

  const advance =
    input.amount_received != null && Number(input.amount_received) > 0
      ? Number(input.amount_received)
      : num(quote["advance_required"]);
  const mode = clean(input.mode ?? quote["advance_mode"] ?? "UPI", 24) || "UPI";
  const utr = clean(input.utr ?? quote["advance_utr"] ?? quote["payment_reference"] ?? "", 120);
  const receipt_no = quote["advance_receipt_no"] ?? `SCP-RCP-${String(id).padStart(4, "0")}`;

  const { error: upErr } = await suryaDb
    .from("quote_requests")
    .update({
      status: "payment_received",
      advance_paid: advance,
      advance_mode: mode,
      advance_utr: utr || null,
      advance_receipt_no: receipt_no,
      advance_verified_at: new Date().toISOString(),
      balance_due: num(quote["estimated_total"]) + num(quote["security_deposit"]) - advance,
    })
    .eq("id", id);
  if (upErr) throw new Error(upErr.message);

  await suryaDb
    .from("quote_payments")
    .update({ status: "verified" })
    .eq("quote_id", id)
    .eq("kind", "advance");

  return { ok: true as const, receipt_no };
}

/** Stage 4 — props physically dispatched: rental clock starts, inventory locks. */
export async function dispatchQuote(input: {
  id: number;
  vehicle?: string;
  notes?: string;
  crew_ids?: number[];
  /** Per-project wage the admin enters for each selected worker at dispatch. */
  crew_wages?: { staff_id: number; daily_wage: number }[];
}) {
  const id = Number(input.id);
  const { data: quote, error } = await suryaDb
    .from("quote_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) throw new Error("Quotation not found.");
  const zeroAdvance = num(quote["advance_required"]) <= 0;
  const dispatchable = zeroAdvance
    ? ["quote_sent", "quote_accepted", "advance_submitted", "payment_received", "on_set"]
    : ["payment_received", "on_set"];
  if (!dispatchable.includes(quote["status"])) {
    throw new Error(
      zeroAdvance
        ? "Send the quotation before dispatching the props."
        : "Confirm the advance payment before dispatching the props.",
    );
  }

  // Field-operations crew deployed with this consignment.
  const wageMap = new Map<number, number>(
    (input.crew_wages ?? []).map((w) => [Number(w.staff_id), Math.max(0, Number(w.daily_wage) || 0)]),
  );
  const crewIds = Array.from(
    new Set([...(input.crew_ids ?? []).map(Number), ...wageMap.keys()].filter(Boolean)),
  );
  let crew: { staff_id: number; staff_code: string; staff_name: string; phone: string; daily_wage: number }[] = [];
  if (crewIds.length > 0) {
    const { data: staff } = await suryaDb
      .from("staff_accounts")
      .select("id, staff_code, full_name, phone")
      .in("id", crewIds);
    crew = (staff ?? []).map((s: Record<string, any>) => ({
      staff_id: Number(s["id"]),
      staff_code: s["staff_code"] ?? "",
      staff_name: s["full_name"] ?? "",
      phone: s["phone"] ?? "",
      daily_wage: wageMap.get(Number(s["id"])) ?? 0,
    }));
  }

  const now = new Date();
  const dispatchUpdate = {
    status: "dispatched",
    dispatch_at: now.toISOString(),
    // The rental clock starts the day the props physically leave the warehouse.
    shoot_start_date: now.toISOString().slice(0, 10),
    dispatch_vehicle: clean(input.vehicle ?? "", 60) || null,
    dispatch_notes: clean(input.notes ?? "", 500) || null,
    assigned_staff_id: crew[0]?.staff_id ?? null,
    assigned_staff_name: crew[0]?.staff_name ?? null,
  };
  // The live database still uses the Phase 2 assignment columns, so the full
  // crew roster (with the wage fixed for this order) is persisted in the
  // crew/labour sidecar instead of a `crew_assignments` column.
  const { error: upErr } = await suryaDb.from("quote_requests").update(dispatchUpdate).eq("id", id);
  if (upErr) throw new Error(upErr.message);
  await writeSidecar(id, { crew_assignments: crew });

  const propIds = ((quote["items"] ?? []) as QuoteItem[]).map((i) => i.prop_id);
  if (propIds.length > 0) {
    await suryaDb.from("props").update({ status: "On-Set" }).in("id", propIds);
  }
  return { ok: true as const, crew_count: crew.length };
}

/**
 * Crew labour charge sheet — day-wise worker roster billed on a separate labour
 * invoice (never mixed with the prop rental invoice). Each day carries its own
 * set of workers: day 1 can be two workers, day 2 a different worker, and the
 * charge for each is the wage fixed for them at dispatch.
 */
export async function saveLabourSheet(input: {
  id: number;
  days: {
    date: string;
    crew?: {
      staff_id: number;
      staff_code?: string;
      staff_name: string;
      daily_wage: number;
      shift?: "day" | "night";
    }[];
    workers?: number;
    rate?: number;
    extra?: number;
    note?: string;
  }[];
}) {
  const id = Number(input.id);
  const days = (input.days ?? [])
    .filter((d) => d.date)
    .map((d) => {
      const extra = Math.max(0, Number(d.extra) || 0);
      const crew = (d.crew ?? []).map((w) => ({
        staff_id: Number(w.staff_id) || 0,
        staff_code: clean(w.staff_code ?? "", 40),
        staff_name: clean(w.staff_name ?? "", 120),
        daily_wage: Math.max(0, Number(w.daily_wage) || 0),
        shift: (w.shift === "night" ? "night" : "day") as "day" | "night",
      }));
      if (crew.length > 0) {
        const base = crew.reduce((s, w) => s + w.daily_wage, 0);
        return {
          date: String(d.date).slice(0, 10),
          crew,
          workers: crew.length,
          rate: Math.round(base / crew.length),
          extra,
          amount: base + extra,
          note: clean(d.note ?? "", 200),
        };
      }
      // Manual fallback when no rostered worker is picked for that day.
      const workers = Math.max(1, Math.round(Number(d.workers) || 1));
      const rate = Math.max(0, Number(d.rate) || 0);
      return {
        date: String(d.date).slice(0, 10),
        crew,
        workers,
        rate,
        extra,
        amount: workers * rate + extra,
        note: clean(d.note ?? "", 200),
      };
    });
  const labour_total = days.reduce((s, d) => s + d.amount, 0);


  const existing = await readSidecar(id);
  const labour_invoice_no =
    existing.labour_invoice_no ??
    `SCP/LAB/${new Date().getFullYear()}/${String(id).padStart(4, "0")}`;

  await writeSidecar(id, {
    labour_days: days as unknown as QuoteRequest["labour_days"],
    labour_total,
    labour_invoice_no,
  });
  return { ok: true as const, labour_total, labour_invoice_no };
}

/** Client's manager fixes how much of the labour invoice they will actually pay. */
export async function closeLabourInvoice(input: { id: number; amount: number }) {
  const id = Number(input.id);
  const amount = Math.max(0, Number(input.amount) || 0);
  await writeSidecar(id, {
    labour_settled_amount: amount,
    labour_status: "closed",
    labour_cleared_at: new Date().toISOString(),
  });
  return { ok: true as const, amount };
}



/** Stage 5 — record return, recompute on actual days used, release inventory. */
export async function recordReturn(input: { id: number; actual_return_date: string }) {
  const { data: quote, error } = await suryaDb
    .from("quote_requests")
    .select("*")
    .eq("id", Number(input.id))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) throw new Error("Quotation not found.");
  if (!input.actual_return_date) throw new Error("Actual return date is required.");

  const clockStart = (quote["dispatch_at"] ?? quote["shoot_start_date"]) as string;
  const actual_days_used = days(String(clockStart).slice(0, 10), input.actual_return_date);

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

/**
 * Stage 5b — closing the order on the amount the client's manager issued.
 * The system settlement (e.g. ₹5,500) can be closed against a lower
 * client-issued amount (e.g. ₹5,000); the difference is recorded as conceded.
 */
export async function closeSettlement(input: { id: number; settled_amount?: number }) {
  const id = Number(input.id);
  const { data: quote, error } = await suryaDb
    .from("quote_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) throw new Error("Quotation not found.");
  if (quote["status"] !== "settled") {
    throw new Error("Record the return and generate the settlement invoice first.");
  }

  const invoiced = num(quote["balance_due"]);
  const settled_amount =
    input.settled_amount == null ? invoiced : Math.max(0, Number(input.settled_amount) || 0);
  const settlement_waived = Math.max(0, invoiced - settled_amount);

  const { error: upErr } = await suryaDb
    .from("quote_requests")
    .update({
      status: "closed",
      production_approved_amount: settled_amount,
      balance_due: 0,
      balance_cleared_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (upErr) throw new Error(upErr.message);
  await writeSidecar(id, { settled_amount, settlement_waived });


  await suryaDb
    .from("quote_payments")
    .update({ amount: settled_amount, reference: `Client-issued settlement · closed` })
    .eq("quote_id", id)
    .eq("kind", "settlement");


  await suryaDb
    .from("quote_payments")
    .update({ status: "verified" })
    .eq("quote_id", id)
    .eq("kind", "settlement");

  return { ok: true as const, settled_amount, settlement_waived };
}


/* ---------- admin: client accounts directory & service history ---------- */

const ACTIVE_QUOTE_STATUSES: QuoteStatus[] = [
  "quote_sent",
  "quote_accepted",
  "advance_submitted",
  "payment_received",
  "dispatched",
  "on_set",
  "settled",
];
const APPROVED_QUOTE_STATUSES: QuoteStatus[] = [
  "quote_accepted",
  "advance_submitted",
  "payment_received",
  "dispatched",
  "on_set",
  "settled",
  "closed",
];

const uniq = (values: (string | null | undefined)[]) =>
  Array.from(new Set(values.map((v) => clean(v ?? "", 160)).filter(Boolean)));

function quoteValue(q: QuoteRequest) {
  return q.final_total > 0 ? q.final_total : q.estimated_total;
}

function buildSummary(
  profileRow: Record<string, any> | undefined,
  userId: string,
  quotes: QuoteRequest[],
  payments: QuotePayment[],
): ClientAccountSummary {
  const approved = quotes.filter((q) => APPROVED_QUOTE_STATUSES.includes(q.status));
  const received = payments
    .filter((p) => p.status === "verified")
    .reduce((s, p) => s + p.amount, 0);
  const deposits = approved
    .filter((q) => q.status !== "closed")
    .reduce((s, q) => s + q.security_deposit, 0);
  const outstanding = quotes
    .filter((q) => q.status !== "closed" && q.status !== "rejected")
    .reduce((s, q) => s + Math.max(0, q.balance_due), 0);
  const latest = quotes[0];

  return {
    user_id: userId,
    email: clean(profileRow?.["email"] ?? "", 200),
    contact_person:
      clean(profileRow?.["contact_person"] ?? "", 160) || latest?.contact_person || "Client",
    designation: clean(profileRow?.["designation"] ?? "", 120) || latest?.client_designation || "",
    phone: clean(profileRow?.["phone"] ?? "", 24) || latest?.phone || "",
    production_house:
      clean(profileRow?.["production_house"] ?? "", 160) || latest?.production_house || "",
    address: clean(profileRow?.["address"] ?? "", 400),
    joined_at: profileRow?.["created_at"] ?? latest?.created_at ?? "",
    production_houses: uniq(quotes.map((q) => q.production_house)),
    movies: uniq(quotes.map((q) => q.movie_name)),
    quotes_total: quotes.length,
    quotes_active: quotes.filter((q) => ACTIVE_QUOTE_STATUSES.includes(q.status)).length,
    quotes_closed: quotes.filter((q) => q.status === "closed").length,
    quoted_value: quotes.reduce((s, q) => s + q.estimated_total, 0),
    approved_value: approved.reduce((s, q) => s + quoteValue(q), 0),
    received_total: received,
    outstanding_total: outstanding,
    deposits_held: deposits,
    last_activity_at: latest?.created_at ?? null,
  };
}

function mapPayment(p: Record<string, any>): QuotePayment {
  return {
    id: Number(p["id"]),
    quote_id: Number(p["quote_id"]),
    kind: p["kind"],
    amount: num(p["amount"]),
    reference: p["reference"] ?? "",
    status: p["status"],
    created_at: p["created_at"],
  };
}

/** Every registered client account with rolled-up service + money history. */
export async function listClientAccounts(): Promise<ClientAccountSummary[]> {
  const [profilesRes, quotesRes, paymentsRes] = await Promise.all([
    suryaDb.from("client_profiles").select("*"),
    suryaDb.from("quote_requests").select("*").order("id", { ascending: false }),
    suryaDb.from("quote_payments").select("*"),
  ]);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (quotesRes.error) throw new Error(quotesRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);

  const quotes = await Promise.all(
    (quotesRes.data ?? []).map((r) => mapQuote(r as Record<string, any>)),
  );
  const payments = (paymentsRes.data ?? []).map((p) => mapPayment(p as Record<string, any>));

  const ids = uniq([
    ...(profilesRes.data ?? []).map((p: any) => String(p.user_id)),
    ...quotes.map((q) => q.user_id),
  ]);

  return ids
    .map((id) => {
      const mine = quotes.filter((q) => q.user_id === id);
      const mineIds = mine.map((q) => q.id);
      return buildSummary(
        (profilesRes.data ?? []).find((p: any) => String(p.user_id) === id),
        id,
        mine,
        payments.filter((p) => mineIds.includes(p.quote_id)),
      );
    })
    .sort((a, b) => (b.last_activity_at ?? "").localeCompare(a.last_activity_at ?? ""));
}

/** Full dossier for one client: quotes, payment ledger and matching invoices. */
export async function getClientDossier(userId: string) {
  const id = clean(userId, 80);
  if (!id) throw new Error("Client id is required.");

  const [profileRes, quotesRes] = await Promise.all([
    suryaDb.from("client_profiles").select("*").eq("user_id", id).maybeSingle(),
    suryaDb.from("quote_requests").select("*").eq("user_id", id).order("id", { ascending: false }),
  ]);
  if (quotesRes.error) throw new Error(quotesRes.error.message);

  const quotes = await Promise.all(
    (quotesRes.data ?? []).map((r) => mapQuote(r as Record<string, any>)),
  );
  const quoteIds = quotes.map((q) => q.id);

  const paymentsRes = quoteIds.length
    ? await suryaDb
        .from("quote_payments")
        .select("*")
        .in("quote_id", quoteIds)
        .order("id", { ascending: false })
    : { data: [], error: null };
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);
  const payments = (paymentsRes.data ?? []).map((p) => mapPayment(p as Record<string, any>));

  const profileRow = (profileRes.data ?? undefined) as Record<string, any> | undefined;
  const profile = buildSummary(profileRow, id, quotes, payments);

  // Direct/manual invoices are not linked by user id — match on phone or banner.
  const phones = uniq([profile.phone, ...quotes.map((q) => q.phone)]);
  const banners = uniq([profile.production_house, ...profile.production_houses]);
  const { data: invoiceRows } = await suryaDb
    .from("invoices")
    .select("*")
    .order("id", { ascending: false });
  const invoices = ((invoiceRows ?? []) as Record<string, any>[])
    .filter(
      (r) =>
        phones.includes(clean(r["client_phone"], 24)) ||
        banners.some(
          (b) => b.toLowerCase() === clean(r["production_house"], 160).toLowerCase(),
        ),
    )
    .map((r) => ({
      id: Number(r["id"]),
      invoice_number: r["invoice_number"],
      doc_type: r["doc_type"],
      client_id: Number(r["client_id"] ?? 0),
      client_name: r["client_name"] ?? "",
      client_phone: r["client_phone"] ?? "",
      production_house: r["production_house"] ?? "",
      shoot_location: r["shoot_location"] ?? "",
      shoot_start_date: r["shoot_start_date"],
      shoot_wrap_date: r["shoot_wrap_date"],
      items: (r["items"] ?? []) as any[],
      subtotal: num(r["subtotal"]),
      discount: num(r["discount"]),
      transport_charges: num(r["transport_charges"]),
      gst_percent: num(r["gst_percent"]),
      gst_amount: num(r["gst_amount"]),
      security_deposit: num(r["security_deposit"]),
      advance_received: num(r["advance_received"]),
      balance_payable: num(r["balance_payable"]),
      payment_status: r["payment_status"],
      notes: r["notes"] ?? "",
      created_at: r["created_at"],
    })) as Invoice[];

  const invoiceReceived = invoices.reduce((s, i) => s + i.advance_received, 0);
  const invoiceOutstanding = invoices.reduce((s, i) => s + Math.max(0, i.balance_payable), 0);

  return {
    profile: {
      ...profile,
      received_total: profile.received_total + invoiceReceived,
      outstanding_total: profile.outstanding_total + invoiceOutstanding,
    },
    quotes,
    payments,
    invoices,
  } satisfies ClientDossier;
}
