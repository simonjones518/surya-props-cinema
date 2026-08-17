// Server-only data layer backed by the Lovable Cloud database.
import { useSession } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  BookingDraft,
  Category,
  Client,
  ClientDraft,
  Invoice,
  InvoiceDraft,
  KpiAnalytics,
  Prop,
  PropRequest,
  PropRequestDraft,
  PropStatus,
  RentalBooking,
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

async function mapProp(row: Record<string, any>): Promise<Prop> {
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
  };
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
  return Promise.all((data ?? []).map((row) => mapProp(row as Record<string, any>)));
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
