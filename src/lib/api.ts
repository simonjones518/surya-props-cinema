import type {
  BookingDraft,
  Category,
  Client,
  ClientDraft,
  Invoice,
  InvoiceDraft,
  KpiAnalytics,
  Prop,
  PropStatus,
  RentalBooking,
  RentalStatus,
} from "./types";
import { mockBookings, mockCategories, mockClients, mockInvoices, mockKpi, mockProps } from "./mock-data";

/**
 * REST service layer for the Hostinger MySQL backend.
 * Set VITE_API_BASE_URL (e.g. https://your-domain.com) to go live.
 * Until then every call falls back to typed mock data so the UI works out-of-the-box.
 */
export const API_BASE_URL = (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? "";
export const isLiveApi = API_BASE_URL.length > 0;

async function request<T>(path: string, fallback: T, init?: RequestInit): Promise<T> {
  if (!isLiveApi) {
    await new Promise((r) => setTimeout(r, 260));
    return fallback;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} failed (${res.status})`);
  return (await res.json()) as T;
}

export const api = {
  getCategories: () => request<Category[]>("/api/categories", mockCategories),
  getProps: () => request<Prop[]>("/api/props", mockProps),
  getClients: () => request<Client[]>("/api/clients", mockClients),
  getBookings: () => request<RentalBooking[]>("/api/bookings", mockBookings),
  getKpi: () => request<KpiAnalytics>("/api/admin/kpi", mockKpi),
  createBooking: (draft: BookingDraft) =>
    request<{ booking_code: string }>(
      "/api/bookings",
      { booking_code: `SCP-BK-${2456 + Math.floor(Date.now() % 500)}` },
      { method: "POST", body: JSON.stringify(draft) },
    ),
  updateBookingStatus: (id: number, rental_status: RentalStatus) =>
    request<{ ok: true }>(`/api/bookings/${id}/status`, { ok: true } as const, {
      method: "PATCH",
      body: JSON.stringify({ rental_status }),
    }),
  refundDeposit: (id: number) =>
    request<{ ok: true }>(`/api/bookings/${id}/refund-deposit`, { ok: true } as const, {
      method: "POST",
    }),
  saveProp: (prop: Partial<Prop>) =>
    request<{ ok: true }>("/api/props", { ok: true } as const, {
      method: "POST",
      body: JSON.stringify(prop),
    }),
  updateProp: (id: number, prop: Partial<Prop>) =>
    request<{ ok: true }>(`/api/props/${id}`, { ok: true } as const, {
      method: "PUT",
      body: JSON.stringify(prop),
    }),
  deleteProp: (id: number) =>
    request<{ ok: true }>(`/api/props/${id}`, { ok: true } as const, { method: "DELETE" }),
  updatePropStatus: (id: number, status: PropStatus) =>
    request<{ ok: true }>(`/api/props/${id}/status`, { ok: true } as const, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  createClient: (client: ClientDraft) =>
    request<Client>("/api/clients", { ...client, id: Math.floor(Date.now() % 100000) } as Client, {
      method: "POST",
      body: JSON.stringify(client),
    }),
  getInvoices: () => request<Invoice[]>("/api/invoices", mockInvoices),
  createInvoice: (draft: InvoiceDraft) =>
    request<{ id: number; invoice_number: string }>(
      "/api/invoices",
      { id: Math.floor(Date.now() % 100000), invoice_number: draft.invoice_number },
      { method: "POST", body: JSON.stringify(draft) },
    ),
};

export const queryKeys = {
  categories: ["categories"] as const,
  props: ["props"] as const,
  bookings: ["bookings"] as const,
  kpi: ["kpi"] as const,
  clients: ["clients"] as const,
  invoices: ["invoices"] as const,
};