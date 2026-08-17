// Server-only data layer backed by the Lovable Cloud database.
import { useSession } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  BookingDraft,
  Category,
  Client,
  ClientDraft,
  Godown,
  Invoice,
  InvoiceDraft,
  KpiAnalytics,
  Prop,
  PropRequest,
  PropRequestDraft,
  PropStatus,
  Rack,
  RentalBooking,
  RentalOrder,
  RentalOrderDraft,
  RentalStatus,
} from "./types";

const BUCKET = "prop-images";
const SIGNED_TTL = 60 * 60 * 24 * 7;

type AdminSession = { unlocked?: boolean };

export async function assertAdmin() {
  const session = await useSession<AdminSession>({
    password: process.env["SESSION_SECRET"]!,
    name: "surya-admin",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  });
  if (!session.data.unlocked) throw new Error("Unauthorized — sign in to the Admin ERP first.");
}

/** image_urls holds either absolute URLs or private storage object paths. */
async function signImages(paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const path of paths) {
    if (!path) continue;
    if (/^(https?:)?\/\//.test(path) || path.startsWith("/") || path.startsWith("data:")) {
      out.push(path);
      continue;
    }
    const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
    if (data?.signedUrl) out.push(data.signedUrl);
  }
  return out;
}

function num(value: unknown) {
  return Number(value ?? 0);
}

type LocationMaps = { godowns: Map<number, string>; racks: Map<number, string> };

async function locationMaps(): Promise<LocationMaps> {
  const [g, r] = await Promise.all([listGodowns(), listRacks()]);
  return {
    godowns: new Map(g.map((x) => [x.id, x.name])),
    racks: new Map(r.map((x) => [x.id, x.rack_name])),
  };
}

async function mapProp(row: Record<string, any>, loc?: LocationMaps): Promise<Prop> {
  const godown_id = row['godown_id'] == null ? null : Number(row['godown_id']);
  const rack_id = row['rack_id'] == null ? null : Number(row['rack_id']);
  return {
    id: Number(row['id']),
    serial_number: row['serial_number'],
    title: row['title'],
    category_id: Number(row['category_id'] ?? 0),
    category_slug: row['category_slug'],
    genre_tags: row['genre_tags'] ?? [],
    daily_rate: num(row['daily_rate']),
    weekly_rate: num(row['weekly_rate']),
    security_deposit: num(row['security_deposit']),
    replacement_value: num(row['replacement_value']),
    condition_rating: row['condition_rating'],
    status: row['status'],
    image_urls: await signImages(row['image_urls'] ?? []),
    ...(row['video_preview_url'] ? { video_preview_url: row['video_preview_url'] } : {}),
    description: row['description'] ?? "",
    qr_code_id: row['qr_code_id'] ?? "",
    description_specs: row['description_specs'] ?? "",
    godown_id,
    rack_id,
    godown_name: (godown_id && loc?.godowns.get(godown_id)) || "",
    rack_name: (rack_id && loc?.racks.get(rack_id)) || "",
  };
}

export async function listGodowns(): Promise<Godown[]> {
  const { data, error } = await supabaseAdmin
    .from("godowns")
    .select("id, name, location_code")
    .order("id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((g: Record<string, any>) => ({
    id: Number(g['id']),
    name: g['name'],
    location_code: g['location_code'],
  }));
}

export async function listRacks(): Promise<Rack[]> {
  const { data, error } = await supabaseAdmin
    .from("racks")
    .select("id, godown_id, rack_name")
    .order("id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, any>) => ({
    id: Number(r['id']),
    godown_id: Number(r['godown_id']),
    rack_name: r['rack_name'],
  }));
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id, name, slug, icon")
    .order("id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({ ...c, id: Number(c.id) })) as Category[];
}

export async function listProps(): Promise<Prop[]> {
  const { data, error } = await supabaseAdmin.from("props").select("*").order("id", { ascending: false });
  if (error) throw new Error(error.message);
  const loc = await locationMaps();
  return Promise.all((data ?? []).map((row) => mapProp(row as Record<string, any>, loc)));
}

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabaseAdmin.from("clients").select("*").order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((c: Record<string, any>) => ({ ...c, id: Number(c['id']) })) as Client[];
}

export async function listBookings(): Promise<RentalBooking[]> {
  const { data, error } = await supabaseAdmin.from("bookings").select("*").order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((b: Record<string, any>) => ({
    ...b,
    id: Number(b['id']),
    client_id: Number(b['client_id'] ?? 0),
    items: b['items'] ?? [],
    total_rent: num(b['total_rent']),
    security_deposit: num(b['security_deposit']),
    advance_paid: num(b['advance_paid']),
    balance_due: num(b['balance_due']),
  })) as RentalBooking[];
}

export async function listInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabaseAdmin.from("invoices").select("*").order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((i: Record<string, any>) => ({
    ...i,
    id: Number(i['id']),
    client_id: Number(i['client_id'] ?? 0),
    items: i['items'] ?? [],
    subtotal: num(i['subtotal']),
    discount: num(i['discount']),
    transport_charges: num(i['transport_charges']),
    gst_percent: num(i['gst_percent']),
    gst_amount: num(i['gst_amount']),
    security_deposit: num(i['security_deposit']),
    advance_received: num(i['advance_received']),
    balance_payable: num(i['balance_payable']),
  })) as Invoice[];
}

export async function computeKpi(): Promise<KpiAnalytics> {
  const [props, bookings, invoices] = await Promise.all([listProps(), listBookings(), listInvoices()]);
  const today = new Date().toISOString().slice(0, 10);
  const active = bookings.filter((b) => b.rental_status === "On-Set" || b.rental_status === "Reserved");
  const revenueToday = invoices
    .filter((i) => i.doc_type === "INVOICE" && i.created_at?.slice(0, 10) === today)
    .reduce((s, i) => s + i.subtotal, 0);

  const months = Array.from({ length: 6 }, (_, k) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - k));
    return { key: d.toISOString().slice(0, 7), label: d.toLocaleDateString("en-IN", { month: "short" }) };
  });
  const revenue_trend = months.map(({ key, label }) => {
    const revenue = invoices
      .filter((i) => i.doc_type === "INVOICE" && i.created_at?.slice(0, 7) === key)
      .reduce((s, i) => s + i.subtotal, 0);
    return { label, revenue, profit: Math.round(revenue * 0.62) };
  });

  return {
    gross_revenue_today: revenueToday,
    net_profit_today: Math.round(revenueToday * 0.62),
    active_rentals: active.length,
    overdue_rentals: bookings.filter((b) => b.rental_status === "Overdue").length,
    advances_collected: invoices.reduce((s, i) => s + i.advance_received, 0),
    on_set_inventory_value: props
      .filter((p) => p.status === "On-Set")
      .reduce((s, p) => s + p.replacement_value, 0),
    warehouse_valuation: props.reduce((s, p) => s + p.replacement_value, 0),
    outstanding_balances: invoices
      .filter((i) => i.doc_type === "INVOICE")
      .reduce((s, i) => s + i.balance_payable, 0),
    held_deposits: bookings
      .filter((b) => b.deposit_status === "Held")
      .reduce((s, b) => s + b.security_deposit, 0),
    revenue_trend,
  };
}

/* ---------- writes (admin only) ---------- */

export async function saveProp(prop: Partial<Prop>) {
  const { data: cat } = await supabaseAdmin
    .from("categories")
    .select("id")
    .eq("slug", prop.category_slug ?? "")
    .maybeSingle();
  const { error } = await supabaseAdmin.from("props").insert({
    serial_number: prop.serial_number!,
    title: prop.title!,
    category_id: cat ? Number(cat.id) : null,
    category_slug: prop.category_slug ?? "gadgets",
    genre_tags: prop.genre_tags ?? [],
    daily_rate: prop.daily_rate ?? 0,
    weekly_rate: prop.weekly_rate ?? 0,
    security_deposit: prop.security_deposit ?? 0,
    replacement_value: prop.replacement_value ?? 0,
    condition_rating: prop.condition_rating ?? "Good",
    status: prop.status ?? "In-Stock",
    image_urls: prop.image_urls ?? [],
    description: prop.description ?? "",
    description_specs: prop.description_specs ?? "",
    godown_id: prop.godown_id ?? null,
    rack_id: prop.rack_id ?? null,
    qr_code_id: prop.qr_code_id ?? `QR-${prop.serial_number}`,
  });
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function updateProp(id: number, prop: Partial<Prop>) {
  const patch = {
    ...(prop.serial_number !== undefined ? { serial_number: prop.serial_number } : {}),
    ...(prop.title !== undefined ? { title: prop.title } : {}),
    ...(prop.category_slug !== undefined ? { category_slug: prop.category_slug } : {}),
    ...(prop.genre_tags !== undefined ? { genre_tags: prop.genre_tags } : {}),
    ...(prop.daily_rate !== undefined ? { daily_rate: prop.daily_rate } : {}),
    ...(prop.weekly_rate !== undefined ? { weekly_rate: prop.weekly_rate } : {}),
    ...(prop.security_deposit !== undefined ? { security_deposit: prop.security_deposit } : {}),
    ...(prop.replacement_value !== undefined ? { replacement_value: prop.replacement_value } : {}),
    ...(prop.condition_rating !== undefined ? { condition_rating: prop.condition_rating } : {}),
    ...(prop.status !== undefined ? { status: prop.status } : {}),
    ...(prop.image_urls !== undefined ? { image_urls: prop.image_urls } : {}),
    ...(prop.description !== undefined ? { description: prop.description } : {}),
    ...(prop.description_specs !== undefined ? { description_specs: prop.description_specs } : {}),
    ...(prop.godown_id !== undefined ? { godown_id: prop.godown_id } : {}),
    ...(prop.rack_id !== undefined ? { rack_id: prop.rack_id } : {}),
    ...(prop.qr_code_id !== undefined ? { qr_code_id: prop.qr_code_id } : {}),
  };
  const { error } = await supabaseAdmin.from("props").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function deleteProp(id: number) {
  const { error } = await supabaseAdmin.from("props").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function updatePropStatus(id: number, status: PropStatus) {
  const { error } = await supabaseAdmin.from("props").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function uploadPropImage(fileName: string, contentType: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${Date.now()}-${safe}`;
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, { contentType });
  if (error) throw new Error(error.message);
  const [preview] = await signImages([path]);
  return { path, preview: preview ?? "" };
}

export async function createClientRecord(draft: ClientDraft): Promise<Client> {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .insert({
      production_house: draft.production_house,
      contact_person: draft.contact_person,
      phone: draft.phone,
      email: draft.email ?? "",
      gst_number: draft.gst_number ?? null,
      address: draft.address ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { ...(data as Record<string, any>), id: Number(data['id']) } as Client;
}

export async function createBooking(draft: BookingDraft) {
  const client = await createClientRecord({
    production_house: draft.production_house,
    contact_person: draft.contact_person,
    phone: draft.phone,
  });
  const { data: prop } = await supabaseAdmin
    .from("props")
    .select("id, title, daily_rate")
    .eq("id", draft.prop_id)
    .maybeSingle();
  const booking_code = `SCP-BK-${Date.now().toString().slice(-6)}`;
  const { error } = await supabaseAdmin.from("bookings").insert({
    booking_code,
    client_id: client.id,
    production_house: draft.production_house,
    start_date: draft.start_date,
    wrap_date: draft.wrap_date,
    items: prop
      ? [
          {
            prop_id: Number(prop.id),
            prop_title: prop.title,
            applied_daily_rate: num(prop.daily_rate),
            quantity: 1,
          },
        ]
      : [],
    total_rent: draft.total_rent,
    security_deposit: draft.security_deposit,
    advance_paid: draft.advance_paid,
    balance_due: draft.balance_due,
    deposit_status: "Held",
    rental_status: "Reserved",
  });
  if (error) throw new Error(error.message);
  if (prop) await supabaseAdmin.from("props").update({ status: "Booked" }).eq("id", draft.prop_id);
  return { booking_code };
}

export async function updateBookingStatus(id: number, rental_status: RentalStatus) {
  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .update({ rental_status })
    .eq("id", id)
    .select("items")
    .single();
  if (error) throw new Error(error.message);
  const items = (booking?.items ?? []) as { prop_id: number }[];
  const propStatus: PropStatus | null =
    rental_status === "On-Set"
      ? "On-Set"
      : rental_status === "Returned"
        ? "In-Stock"
        : rental_status === "Damaged"
          ? "Maintenance"
          : null;
  if (propStatus && items.length) {
    await supabaseAdmin
      .from("props")
      .update({ status: propStatus })
      .in("id", items.map((i) => i.prop_id));
  }
  return { ok: true as const };
}

export async function refundDeposit(id: number) {
  const { error } = await supabaseAdmin
    .from("bookings")
    .update({ deposit_status: "Refunded" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function createInvoice(draft: InvoiceDraft) {
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .insert({
      invoice_number: draft.invoice_number,
      doc_type: draft.doc_type,
      client_id: draft.client_id || null,
      client_name: draft.client_name,
      client_phone: draft.client_phone,
      production_house: draft.production_house,
      shoot_location: draft.shoot_location ?? null,
      shoot_start_date: draft.shoot_start_date,
      shoot_wrap_date: draft.shoot_wrap_date,
      items: draft.items as unknown as any,
      subtotal: draft.subtotal,
      discount: draft.discount,
      transport_charges: draft.transport_charges,
      gst_percent: draft.gst_percent,
      gst_amount: draft.gst_amount,
      security_deposit: draft.security_deposit,
      advance_received: draft.advance_received,
      balance_payable: draft.balance_payable,
      payment_status: draft.payment_status,
      notes: draft.notes ?? null,
    })
    .select("id, invoice_number")
    .single();
  if (error) throw new Error(error.message);
  return { id: Number(data.id), invoice_number: data.invoice_number as string };
}

/* ---------- customer prop requests ---------- */

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function clean(value: unknown, max = 400) {
  return String(value ?? "").trim().slice(0, max);
}

/** Public: customers upload reference photos for custom prop requests. */
export async function uploadRequestImage(fileName: string, contentType: string, base64: string) {
  if (!/^image\/(png|jpe?g|webp|gif|heic|heif)$/i.test(contentType)) {
    throw new Error("Only image files can be attached.");
  }
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error("Image is larger than 8 MB.");
  const safe = clean(fileName, 80).replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `requests/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, { contentType });
  if (error) throw new Error(error.message);
  const [preview] = await signImages([path]);
  return { path, preview: preview ?? "" };
}

function mapRequest(row: Record<string, any>, images: string[]): PropRequest {
  return {
    id: Number(row['id']),
    request_code: row['request_code'],
    request_type: row['request_type'],
    prop_id: row['prop_id'] === null ? null : Number(row['prop_id']),
    prop_title: row['prop_title'] ?? "",
    custom_description: row['custom_description'] ?? "",
    reference_image_urls: images,
    production_house: row['production_house'] ?? "",
    contact_person: row['contact_person'] ?? "",
    phone: row['phone'] ?? "",
    shoot_location: row['shoot_location'] ?? "",
    shoot_start_date: row['shoot_start_date'] ?? null,
    shoot_wrap_date: row['shoot_wrap_date'] ?? null,
    quantity: Number(row['quantity'] ?? 1),
    notes: row['notes'] ?? null,
    status: row['status'],
    created_at: row['created_at'],
  };
}

/** Public write: a customer requests a catalog prop or a custom prop. */
export async function createPropRequest(draft: PropRequestDraft) {
  const type = draft.request_type === "Custom" ? "Custom" : "Catalog";
  const contact = clean(draft.contact_person, 120);
  const phone = clean(draft.phone, 24);
  if (!contact || !phone) throw new Error("Contact name and phone are required.");

  const request_code = `SCP-REQ-${Date.now().toString().slice(-6)}`;
  const images = (draft.reference_image_urls ?? []).slice(0, 6).map((p) => clean(p, 300));
  const { error } = await supabaseAdmin.from("prop_requests").insert({
    request_code,
    request_type: type,
    prop_id: type === "Catalog" && draft.prop_id ? Number(draft.prop_id) : null,
    prop_title: clean(draft.prop_title, 160),
    custom_description: clean(draft.custom_description, 2000),
    reference_image_urls: images,
    production_house: clean(draft.production_house, 160),
    contact_person: contact,
    phone,
    shoot_location: clean(draft.shoot_location, 240),
    shoot_start_date: draft.shoot_start_date || null,
    shoot_wrap_date: draft.shoot_wrap_date || null,
    quantity: Math.max(1, Math.min(99, Number(draft.quantity ?? 1))),
    notes: draft.notes ? clean(draft.notes, 1000) : null,
    status: "New",
  });
  if (error) throw new Error(error.message);
  return { request_code };
}

export async function listPropRequests(): Promise<PropRequest[]> {
  const { data, error } = await supabaseAdmin
    .from("prop_requests")
    .select("*")
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return Promise.all(
    (data ?? []).map(async (row: Record<string, any>) =>
      mapRequest(row, await signImages(row['reference_image_urls'] ?? [])),
    ),
  );
}

export async function updateRequestStatus(id: number, status: PropRequest["status"]) {
  const { error } = await supabaseAdmin.from("prop_requests").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

/* ---------- rental orders: estimated challan → actual return settlement ---------- */

function daysBetween(from: string, to: string) {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

function mapOrder(row: Record<string, any>): RentalOrder {
  return {
    id: Number(row['id']),
    order_number: row['order_number'],
    client_name: row['client_name'] ?? "",
    production_house: row['production_house'] ?? "",
    phone_number: row['phone_number'] ?? "",
    shoot_location: row['shoot_location'] ?? "",
    dispatch_date: row['dispatch_date'],
    estimated_return_date: row['estimated_return_date'],
    actual_return_date: row['actual_return_date'] ?? null,
    estimated_days: Number(row['estimated_days'] ?? 1),
    actual_days_used: row['actual_days_used'] == null ? null : Number(row['actual_days_used']),
    advance_received: num(row['advance_received']),
    security_deposit: num(row['security_deposit']),
    estimated_total: num(row['estimated_total']),
    total_final_amount: num(row['total_final_amount']),
    balance_payable: num(row['balance_payable']),
    order_status: row['order_status'],
    items: (row['items'] ?? []) as RentalOrder["items"],
    notes: row['notes'] ?? null,
    created_at: row['created_at'],
  };
}

export async function listRentalOrders(): Promise<RentalOrder[]> {
  const { data, error } = await supabaseAdmin
    .from("rental_orders")
    .select("*")
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, any>) => mapOrder(row));
}

/** Stage 1 — estimated delivery challan created when props leave the warehouse. */
export async function createRentalOrder(draft: RentalOrderDraft): Promise<RentalOrder> {
  if (!draft.items?.length) throw new Error("Add at least one prop to the order.");
  const estimated_days = Math.max(
    1,
    Number(draft.estimated_days) ||
      daysBetween(draft.dispatch_date, draft.estimated_return_date),
  );
  const items = draft.items.map((i) => ({
    ...i,
    quantity: Math.max(1, Number(i.quantity) || 1),
    manual_daily_rate: num(i.manual_daily_rate),
    estimated_days,
    actual_days_used: null,
    line_total: num(i.manual_daily_rate) * Math.max(1, Number(i.quantity) || 1) * estimated_days,
  }));
  const estimated_total = items.reduce((s, i) => s + i.line_total, 0);
  const advance = num(draft.advance_received);
  const order_number = `SCP-ORD-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

  const { data, error } = await supabaseAdmin
    .from("rental_orders")
    .insert({
      order_number,
      client_name: clean(draft.client_name, 150),
      production_house: clean(draft.production_house, 200),
      phone_number: clean(draft.phone_number, 24),
      shoot_location: clean(draft.shoot_location, 300),
      dispatch_date: draft.dispatch_date,
      estimated_return_date: draft.estimated_return_date,
      estimated_days,
      advance_received: advance,
      security_deposit: num(draft.security_deposit),
      estimated_total,
      total_final_amount: estimated_total,
      balance_payable: estimated_total - advance,
      order_status: "Estimated/On-Set",
      items: items as unknown as any,
      notes: draft.notes ? clean(draft.notes, 1000) : null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const propIds = items.map((i) => i.prop_id).filter(Boolean);
  if (propIds.length) await supabaseAdmin.from("props").update({ status: "On-Set" }).in("id", propIds);
  return mapOrder(data as Record<string, any>);
}

/** Stage 2 — actual return: recalculate the bill on real days used. */
export async function settleRentalOrder(id: number, actual_return_date: string): Promise<RentalOrder> {
  const { data: row, error: readError } = await supabaseAdmin
    .from("rental_orders")
    .select("*")
    .eq("id", id)
    .single();
  if (readError) throw new Error(readError.message);
  const order = mapOrder(row as Record<string, any>);

  const actual_days_used = daysBetween(order.dispatch_date, actual_return_date);
  const items = order.items.map((i) => ({
    ...i,
    actual_days_used,
    line_total: i.manual_daily_rate * i.quantity * actual_days_used,
  }));
  const total_final_amount = items.reduce((s, i) => s + i.line_total, 0);

  const { data, error } = await supabaseAdmin
    .from("rental_orders")
    .update({
      actual_return_date,
      actual_days_used,
      items: items as unknown as any,
      total_final_amount,
      balance_payable: total_final_amount - order.advance_received,
      order_status: "Returned & Settled",
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const propIds = items.map((i) => i.prop_id).filter(Boolean);
  if (propIds.length) await supabaseAdmin.from("props").update({ status: "In-Stock" }).in("id", propIds);
  return mapOrder(data as Record<string, any>);
}

export async function cancelRentalOrder(id: number) {
  const { data, error } = await supabaseAdmin
    .from("rental_orders")
    .update({ order_status: "Cancelled" })
    .eq("id", id)
    .select("items")
    .single();
  if (error) throw new Error(error.message);
  const items = (data?.items ?? []) as { prop_id: number }[];
  const propIds = items.map((i) => i.prop_id).filter(Boolean);
  if (propIds.length) await supabaseAdmin.from("props").update({ status: "In-Stock" }).in("id", propIds);
  return { ok: true as const };
}
