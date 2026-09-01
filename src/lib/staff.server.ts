// Server-only data layer for Inventory Staff & Field Operations roles.
import { useSession } from "@tanstack/react-start/server";
import { suryaDb } from "./surya-supabase.server";
import type {
  DamageReport,
  DispatchLog,
  Expense,
  ExpenseCategory,
  FieldAssignment,
  StaffAccount,
  StaffRole,
  StaffSession,
} from "./staff-types";

const BUCKET = "prop-images";
const SIGNED_TTL = 60 * 60 * 24 * 7;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

type Cookie = { staffId?: number; role?: StaffRole; name?: string; code?: string };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "surya-staff",
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

function session() {
  return useSession<Cookie>(sessionConfig());
}

function clean(v: unknown, max = 300) {
  return String(v ?? "").trim().slice(0, max);
}

function num(v: unknown) {
  return Number(v ?? 0);
}

/* ---------- password hashing (PBKDF2-SHA256, Worker-safe WebCrypto) ---------- */

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Edge/Worker WebCrypto caps PBKDF2 at 100,000 iterations. */
const PBKDF2_ITERATIONS = 100_000;

async function derive(password: string, saltHex: string, iterations = PBKDF2_ITERATIONS) {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: Math.min(iterations, 100_000), hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

async function hashPassword(password: string) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${await derive(password, salt)}`;
}

async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  // new format: pbkdf2$<iterations>$<salt>$<digest>; legacy: pbkdf2$<salt>$<digest>
  const [salt, digest, iterations] =
    parts.length === 4
      ? [parts[2], parts[3], Number(parts[1])]
      : [parts[1], parts[2], PBKDF2_ITERATIONS];
  if (!salt || !digest) return false;
  return (await derive(password, salt, iterations || PBKDF2_ITERATIONS)) === digest;
}

/* ---------- session ---------- */

export async function currentStaff(): Promise<StaffSession | null> {
  const s = await session();
  if (!s.data.staffId) return null;
  return {
    id: Number(s.data.staffId),
    full_name: s.data.name ?? "",
    staff_role: (s.data.role ?? "field") as StaffRole,
    staff_code: s.data.code ?? "",
  };
}

export async function requireStaff(role?: StaffRole) {
  const me = await currentStaff();
  if (!me) throw new Error("Please sign in with your staff credentials.");
  if (role && me.staff_role !== role) throw new Error("Your role cannot access this screen.");
  return me;
}

export async function staffSignIn(input: { username: string; password: string }) {
  const username = clean(input.username, 60).toLowerCase();
  const { data, error } = await suryaDb
    .from("staff_accounts")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data["active"] !== true) return { ok: false as const };
  if (!(await verifyPassword(String(input.password ?? ""), data["password_hash"] as string))) {
    return { ok: false as const };
  }
  const s = await session();
  await s.update({
    staffId: Number(data["id"]),
    role: data["staff_role"] as StaffRole,
    name: data["full_name"] as string,
    code: data["staff_code"] as string,
  });
  return { ok: true as const, staff_role: data["staff_role"] as StaffRole };
}

export async function staffSignOut() {
  const s = await session();
  await s.clear();
  return { ok: true as const };
}

/* ---------- manager: staff account management ---------- */

function mapStaff(r: Record<string, any>): StaffAccount {
  return {
    id: Number(r["id"]),
    staff_code: r["staff_code"] ?? "",
    full_name: r["full_name"] ?? "",
    phone: r["phone"] ?? "",
    staff_role: (r["staff_role"] ?? "field") as StaffRole,
    username: r["username"] ?? "",
    active: r["active"] !== false,
    created_at: r["created_at"],
  };
}

export async function listStaff(): Promise<StaffAccount[]> {
  const { data, error } = await suryaDb
    .from("staff_accounts")
    .select("*")
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapStaff(r as Record<string, any>));
}

export async function createStaff(input: {
  full_name: string;
  phone: string;
  staff_role: StaffRole;
  username: string;
  password: string;
}) {
  const full_name = clean(input.full_name, 120);
  const username = clean(input.username, 60).toLowerCase().replace(/\s+/g, "");
  const password = String(input.password ?? "");
  if (!full_name) throw new Error("Staff full name is required.");
  if (!/^[a-z0-9._-]{4,}$/.test(username)) {
    throw new Error("Username must be 4+ characters (letters, numbers, dot, dash, underscore).");
  }
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  const role: StaffRole = input.staff_role === "inventory" ? "inventory" : "field";
  const prefix = role === "inventory" ? "SCP-INV" : "SCP-FLD";
  const staff_code = `${prefix}-${Date.now().toString().slice(-5)}`;

  const { data, error } = await suryaDb
    .from("staff_accounts")
    .insert({
      staff_code,
      full_name,
      phone: clean(input.phone, 24),
      staff_role: role,
      username,
      password_hash: await hashPassword(password),
    })
    .select("*")
    .maybeSingle();
  if (error || !data) {
    throw new Error(
      /duplicate|unique/i.test(error?.message ?? "")
        ? "That username is already taken."
        : (error?.message ?? "Could not create the staff account."),
    );
  }
  return mapStaff(data as Record<string, any>);
}

export async function setStaffActive(input: { id: number; active: boolean }) {
  const { error } = await suryaDb
    .from("staff_accounts")
    .update({ active: !!input.active, updated_at: new Date().toISOString() })
    .eq("id", Number(input.id));
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function resetStaffPassword(input: { id: number; password: string }) {
  if (String(input.password ?? "").length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  const { error } = await suryaDb
    .from("staff_accounts")
    .update({
      password_hash: await hashPassword(String(input.password)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", Number(input.id));
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function deleteStaff(id: number) {
  const { error } = await suryaDb.from("staff_accounts").delete().eq("id", Number(id));
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

/** Manager assigns a field worker to a rental order. */
export async function assignStaffToQuote(input: { quote_id: number; staff_id: number | null }) {
  let name: string | null = null;
  if (input.staff_id) {
    const { data } = await suryaDb
      .from("staff_accounts")
      .select("full_name")
      .eq("id", Number(input.staff_id))
      .maybeSingle();
    name = (data?.["full_name"] as string) ?? null;
  }
  const { error } = await suryaDb
    .from("quote_requests")
    .update({
      assigned_staff_id: input.staff_id ? Number(input.staff_id) : null,
      assigned_staff_name: name,
    })
    .eq("id", Number(input.quote_id));
  if (error) throw new Error(error.message);
  return { ok: true as const, assigned_staff_name: name };
}

/* ---------- shared helpers ---------- */

async function signOne(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^(https?:)?\/\//.test(path)) return path;
  const { data } = await suryaDb.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl ?? null;
}

export async function uploadFieldPhoto(input: {
  fileName: string;
  contentType: string;
  base64: string;
}) {
  await requireStaff();
  if (!/^image\/(png|jpe?g|webp|heic|heif)$/i.test(input.contentType)) {
    throw new Error("Upload a PNG or JPG photo.");
  }
  const bytes = Uint8Array.from(atob(input.base64), (c) => c.charCodeAt(0));
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error("Photo is larger than 8 MB.");
  const safe = clean(input.fileName, 80).replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `field/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  const { error } = await suryaDb.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: input.contentType });
  if (error) throw new Error(error.message);
  return { path };
}

/* ---------- field operations ---------- */

const FIELD_STATES = ["payment_received", "quote_accepted", "dispatched", "on_set", "settled"];

export async function listFieldAssignments(): Promise<FieldAssignment[]> {
  const me = await requireStaff();
  const { data, error } = await suryaDb
    .from("quote_requests")
    .select("*")
    .in("status", FIELD_STATES)
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, any>[];
  const mine =
    me.staff_role === "field"
      ? rows.filter(
          (r) => r["assigned_staff_id"] == null || Number(r["assigned_staff_id"]) === me.id,
        )
      : rows;
  return mine.map((r) => ({
    id: Number(r["id"]),
    quote_code: r["quote_code"] ?? "",
    production_house: r["production_house"] ?? "",
    movie_name: r["movie_name"] ?? "",
    contact_person: r["contact_person"] ?? "",
    phone: r["phone"] ?? "",
    shoot_location: r["shoot_location"] ?? "",
    shoot_start_date: r["shoot_start_date"],
    estimated_return_date: r["estimated_return_date"],
    status: r["status"],
    assigned_staff_name: r["assigned_staff_name"] ?? null,
    items: ((r["items"] ?? []) as any[]).map((i) => ({
      prop_id: Number(i.prop_id),
      prop_name: i.prop_name ?? "",
      quantity: Number(i.quantity ?? 1),
      serial_number: i.serial_number ?? "",
    })),
  }));
}

export async function logDispatch(input: {
  quote_id: number;
  kind: "dispatch" | "return";
  vehicle_number: string;
  photo_path?: string | null;
  notes?: string;
}) {
  const me = await requireStaff();
  const { data: quote } = await suryaDb
    .from("quote_requests")
    .select("quote_code")
    .eq("id", Number(input.quote_id))
    .maybeSingle();
  const vehicle = clean(input.vehicle_number, 40);
  if (!vehicle) throw new Error("Vehicle number is required.");
  const { error } = await suryaDb.from("dispatch_logs").insert({
    quote_id: Number(input.quote_id),
    quote_code: (quote?.["quote_code"] as string) ?? "",
    kind: input.kind === "return" ? "return" : "dispatch",
    vehicle_number: vehicle,
    photo_path: input.photo_path ?? null,
    notes: clean(input.notes ?? "", 500),
    staff_id: me.id,
    staff_name: me.full_name,
  });
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function reportDamage(input: {
  quote_id: number;
  prop_id?: number | null;
  prop_name: string;
  severity: "minor" | "major" | "lost";
  description: string;
  photo_path?: string | null;
}) {
  const me = await requireStaff();
  const description = clean(input.description, 800);
  if (!description) throw new Error("Describe the damage or incident.");
  const { data: quote } = await suryaDb
    .from("quote_requests")
    .select("quote_code")
    .eq("id", Number(input.quote_id))
    .maybeSingle();
  const { error } = await suryaDb.from("damage_reports").insert({
    quote_id: Number(input.quote_id),
    quote_code: (quote?.["quote_code"] as string) ?? "",
    prop_id: input.prop_id ? Number(input.prop_id) : null,
    prop_name: clean(input.prop_name, 200),
    severity: ["minor", "major", "lost"].includes(input.severity) ? input.severity : "minor",
    description,
    photo_path: input.photo_path ?? null,
    staff_id: me.id,
    staff_name: me.full_name,
  });
  if (error) throw new Error(error.message);
  if (input.prop_id && input.severity !== "minor") {
    await suryaDb
      .from("props")
      .update({ status: input.severity === "lost" ? "Lost" : "Damaged" })
      .eq("id", Number(input.prop_id));
  }
  return { ok: true as const };
}

/* ---------- reads shared by manager + staff ---------- */

export async function listDispatchLogs(): Promise<DispatchLog[]> {
  const { data, error } = await suryaDb
    .from("dispatch_logs")
    .select("*")
    // 'crew_labour' rows carry the crew/labour JSON sidecar, not a field log.
    .in("kind", ["dispatch", "return"])
    .order("id", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return Promise.all(
    (data ?? []).map(async (r: Record<string, any>) => ({
      id: Number(r["id"]),
      quote_id: r["quote_id"] == null ? null : Number(r["quote_id"]),
      quote_code: r["quote_code"] ?? "",
      kind: (r["kind"] ?? "dispatch") as "dispatch" | "return",
      vehicle_number: r["vehicle_number"] ?? "",
      photo_url: await signOne(r["photo_path"] ?? null),
      notes: r["notes"] ?? "",
      staff_name: r["staff_name"] ?? "",
      created_at: r["created_at"],
    })),
  );
}

export async function listDamageReports(): Promise<DamageReport[]> {
  const { data, error } = await suryaDb
    .from("damage_reports")
    .select("*")
    .order("id", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return Promise.all(
    (data ?? []).map(async (r: Record<string, any>) => ({
      id: Number(r["id"]),
      quote_id: r["quote_id"] == null ? null : Number(r["quote_id"]),
      quote_code: r["quote_code"] ?? "",
      prop_id: r["prop_id"] == null ? null : Number(r["prop_id"]),
      prop_name: r["prop_name"] ?? "",
      severity: (r["severity"] ?? "minor") as "minor" | "major" | "lost",
      description: r["description"] ?? "",
      photo_url: await signOne(r["photo_path"] ?? null),
      staff_name: r["staff_name"] ?? "",
      status: (r["status"] ?? "open") as "open" | "resolved",
      created_at: r["created_at"],
    })),
  );
}

export async function resolveDamageReport(id: number) {
  const { error } = await suryaDb
    .from("damage_reports")
    .update({ status: "resolved" })
    .eq("id", Number(id));
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

/* ---------- expense ledger + executive KPIs ---------- */

export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await suryaDb
    .from("expense_ledger")
    .select("*")
    .order("spent_on", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, any>) => ({
    id: Number(r["id"]),
    category: (r["category"] ?? "other") as ExpenseCategory,
    amount: num(r["amount"]),
    description: r["description"] ?? "",
    spent_on: r["spent_on"],
    created_at: r["created_at"],
  }));
}

export async function addExpense(input: {
  category: ExpenseCategory;
  amount: number;
  description: string;
  spent_on: string;
}) {
  const amount = Number(input.amount);
  if (!(amount > 0)) throw new Error("Enter an amount greater than zero.");
  const { error } = await suryaDb.from("expense_ledger").insert({
    category: input.category,
    amount,
    description: clean(input.description, 300),
    spent_on: input.spent_on || new Date().toISOString().slice(0, 10),
  });
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function deleteExpense(id: number) {
  const { error } = await suryaDb.from("expense_ledger").delete().eq("id", Number(id));
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export type ExecutiveKpi = {
  capital_invested: number;
  replacement_valuation: number;
  props_in_house: number;
  props_on_set: number;
  expected_inflow: number;
  realized_revenue: number;
  total_expenses: number;
  net_profit: number;
  open_damage_reports: number;
  monthly: { month: string; revenue: number; expenses: number }[];
};

export async function executiveKpi(): Promise<ExecutiveKpi> {
  const [{ data: props }, { data: quotes }, { data: expenses }, { data: damages }] =
    await Promise.all([
      suryaDb.from("props").select("acquisition_cost, replacement_value, status"),
      suryaDb
        .from("quote_requests")
        .select(
          "status, estimated_total, final_total, worker_deployment_fee, production_approved_amount, advance_paid, balance_due, created_at, balance_cleared_at",
        ),
      suryaDb.from("expense_ledger").select("amount, spent_on"),
      suryaDb.from("damage_reports").select("status"),
    ]);

  const propRows = (props ?? []) as Record<string, any>[];
  const capital_invested = propRows.reduce((s, p) => s + num(p["acquisition_cost"]), 0);
  const replacement_valuation = propRows.reduce((s, p) => s + num(p["replacement_value"]), 0);
  const props_on_set = propRows.filter((p) => p["status"] === "On-Set").length;
  const props_in_house = propRows.length - props_on_set;

  const quoteRows = (quotes ?? []) as Record<string, any>[];
  const orderValue = (q: Record<string, any>) => {
    const approved = q["production_approved_amount"];
    if (approved != null) return num(approved);
    const base = num(q["final_total"]) || num(q["estimated_total"]);
    return base + num(q["worker_deployment_fee"]);
  };
  const expected_inflow = quoteRows
    .filter((q) => !["closed", "rejected"].includes(q["status"]))
    .reduce((s, q) => s + orderValue(q), 0);
  const realized_revenue = quoteRows.reduce(
    (s, q) => s + (q["status"] === "closed" ? orderValue(q) : num(q["advance_paid"])),
    0,
  );

  const expenseRows = (expenses ?? []) as Record<string, any>[];
  const total_expenses = expenseRows.reduce((s, e) => s + num(e["amount"]), 0);

  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  const monthly = months.map((month) => ({
    month,
    revenue: quoteRows
      .filter((q) => String(q["balance_cleared_at"] ?? q["created_at"] ?? "").startsWith(month))
      .reduce((s, q) => s + orderValue(q), 0),
    expenses: expenseRows
      .filter((e) => String(e["spent_on"] ?? "").startsWith(month))
      .reduce((s, e) => s + num(e["amount"]), 0),
  }));

  return {
    capital_invested,
    replacement_valuation,
    props_in_house,
    props_on_set,
    expected_inflow,
    realized_revenue,
    total_expenses,
    net_profit: realized_revenue - total_expenses,
    open_damage_reports: ((damages ?? []) as Record<string, any>[]).filter(
      (d) => d["status"] !== "resolved",
    ).length,
    monthly,
  };
}
