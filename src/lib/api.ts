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
import {
  createBookingFn,
  createClientFn,
  createInvoiceFn,
  createPropFn,
  deletePropFn,
  fetchBookings,
  fetchCategories,
  fetchClients,
  fetchInvoices,
  fetchKpi,
  fetchProps,
  refundDepositFn,
  updateBookingStatusFn,
  updatePropFn,
  updatePropStatusFn,
  uploadPropImageFn,
} from "./inventory.functions";

/**
 * Data layer — live against the project database (Lovable Cloud).
 * Public catalog reads are open; every admin read/write requires the
 * Admin ERP session cookie and is enforced on the server.
 */
export const api = {
  getCategories: () => fetchCategories() as Promise<Category[]>,
  getProps: () => fetchProps() as Promise<Prop[]>,
  getClients: () => fetchClients() as Promise<Client[]>,
  getBookings: () => fetchBookings() as Promise<RentalBooking[]>,
  getKpi: () => fetchKpi() as Promise<KpiAnalytics>,
  getInvoices: () => fetchInvoices() as Promise<Invoice[]>,
  createBooking: (draft: BookingDraft) => createBookingFn({ data: draft }),
  updateBookingStatus: (id: number, rental_status: RentalStatus) =>
    updateBookingStatusFn({ data: { id, rental_status } }),
  refundDeposit: (id: number) => refundDepositFn({ data: { id } }),
  saveProp: (prop: Partial<Prop>) => createPropFn({ data: prop }),
  updateProp: (id: number, prop: Partial<Prop>) => updatePropFn({ data: { id, prop } }),
  deleteProp: (id: number) => deletePropFn({ data: { id } }),
  updatePropStatus: (id: number, status: PropStatus) => updatePropStatusFn({ data: { id, status } }),
  createClient: (client: ClientDraft) => createClientFn({ data: client }) as Promise<Client>,
  createInvoice: (draft: InvoiceDraft) => createInvoiceFn({ data: draft }),
  uploadPropImage: async (file: File) => {
    const buffer = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
    return uploadPropImageFn({
      data: {
        fileName: file.name,
        contentType: file.type || "image/jpeg",
        base64: btoa(binary),
      },
    });
  },
};

export const queryKeys = {
  categories: ["categories"] as const,
  props: ["props"] as const,
  bookings: ["bookings"] as const,
  kpi: ["kpi"] as const,
  clients: ["clients"] as const,
  invoices: ["invoices"] as const,
};
