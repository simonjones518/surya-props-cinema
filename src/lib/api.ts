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
  RequestStatus,
} from "./types";
import {
  cancelRentalOrderFn,
  createBookingFn,
  createClientFn,
  createInvoiceFn,
  createPropFn,
  createPropRequestFn,
  createRentalOrderFn,
  deletePropFn,
  fetchBookings,
  fetchCategories,
  fetchClients,
  fetchGodowns,
  fetchInvoices,
  fetchKpi,
  fetchProps,
  fetchPropRequests,
  fetchRacks,
  fetchRentalOrders,
  refundDepositFn,
  settleRentalOrderFn,
  updateBookingStatusFn,
  updatePropFn,
  updatePropStatusFn,
  updateRequestStatusFn,
  uploadPropImageFn,
  uploadRequestImageFn,
} from "./inventory.functions";

async function toBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

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
  getPropRequests: () => fetchPropRequests() as Promise<PropRequest[]>,
  getGodowns: () => fetchGodowns() as Promise<Godown[]>,
  getRacks: () => fetchRacks() as Promise<Rack[]>,
  getRentalOrders: () => fetchRentalOrders() as Promise<RentalOrder[]>,
  createRentalOrder: (draft: RentalOrderDraft) =>
    createRentalOrderFn({ data: draft }) as Promise<RentalOrder>,
  settleRentalOrder: (id: number, actual_return_date: string) =>
    settleRentalOrderFn({ data: { id, actual_return_date } }) as Promise<RentalOrder>,
  cancelRentalOrder: (id: number) => cancelRentalOrderFn({ data: { id } }),
  createPropRequest: (draft: PropRequestDraft) => createPropRequestFn({ data: draft }),
  updateRequestStatus: (id: number, status: RequestStatus) =>
    updateRequestStatusFn({ data: { id, status } }),
  uploadRequestImage: async (file: File) =>
    uploadRequestImageFn({
      data: {
        fileName: file.name,
        contentType: file.type || "image/jpeg",
        base64: await toBase64(file),
      },
    }),
  uploadPropImage: async (file: File) => {
    return uploadPropImageFn({
      data: {
        fileName: file.name,
        contentType: file.type || "image/jpeg",
        base64: await toBase64(file),
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
  requests: ["prop-requests"] as const,
  godowns: ["godowns"] as const,
  racks: ["racks"] as const,
  orders: ["rental-orders"] as const,
};
