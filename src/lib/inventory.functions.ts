import { createServerFn } from "@tanstack/react-start";
import type {
  BookingDraft,
  ClientDraft,
  InvoiceDraft,
  Prop,
  PropRequestDraft,
  PropStatus,
  RentalOrderDraft,
  RentalStatus,
  RequestStatus,
} from "./types";

const db = () => import("./inventory.server");

/* ---------- public reads ---------- */

export const fetchCategories = createServerFn({ method: "GET" }).handler(async () =>
  (await db()).listCategories(),
);

export const fetchProps = createServerFn({ method: "GET" }).handler(async () =>
  (await db()).listProps(),
);

/* ---------- admin reads ---------- */

export const fetchClients = createServerFn({ method: "GET" }).handler(async () => {
  const m = await db();
  await m.assertAdmin();
  return m.listClients();
});

export const fetchBookings = createServerFn({ method: "GET" }).handler(async () => {
  const m = await db();
  await m.assertAdmin();
  return m.listBookings();
});

export const fetchInvoices = createServerFn({ method: "GET" }).handler(async () => {
  const m = await db();
  await m.assertAdmin();
  return m.listInvoices();
});

export const fetchKpi = createServerFn({ method: "GET" }).handler(async () => {
  const m = await db();
  await m.assertAdmin();
  return m.computeKpi();
});

/* ---------- admin writes ---------- */

export const createPropFn = createServerFn({ method: "POST" })
  .inputValidator((data: Partial<Prop>) => data)
  .handler(async ({ data }) => {
    const m = await db();
    await m.assertAdmin();
    return m.saveProp(data);
  });

export const updatePropFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number; prop: Partial<Prop> }) => data)
  .handler(async ({ data }) => {
    const m = await db();
    await m.assertAdmin();
    return m.updateProp(data.id, data.prop);
  });

export const deletePropFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    const m = await db();
    await m.assertAdmin();
    return m.deleteProp(data.id);
  });

export const updatePropStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number; status: PropStatus }) => data)
  .handler(async ({ data }) => {
    const m = await db();
    await m.assertAdmin();
    return m.updatePropStatus(data.id, data.status);
  });

export const uploadPropImageFn = createServerFn({ method: "POST" })
  .inputValidator((data: { fileName: string; contentType: string; base64: string }) => data)
  .handler(async ({ data }) => {
    const m = await db();
    await m.assertAdmin();
    return m.uploadPropImage(data.fileName, data.contentType, data.base64);
  });

export const createClientFn = createServerFn({ method: "POST" })
  .inputValidator((data: ClientDraft) => data)
  .handler(async ({ data }) => {
    const m = await db();
    await m.assertAdmin();
    return m.createClientRecord(data);
  });

export const updateBookingStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number; rental_status: RentalStatus }) => data)
  .handler(async ({ data }) => {
    const m = await db();
    await m.assertAdmin();
    return m.updateBookingStatus(data.id, data.rental_status);
  });

export const refundDepositFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    const m = await db();
    await m.assertAdmin();
    return m.refundDeposit(data.id);
  });

export const createInvoiceFn = createServerFn({ method: "POST" })
  .inputValidator((data: InvoiceDraft) => data)
  .handler(async ({ data }) => {
    const m = await db();
    await m.assertAdmin();
    return m.createInvoice(data);
  });

/* ---------- public write: customer rent request ---------- */

export const createBookingFn = createServerFn({ method: "POST" })
  .inputValidator((data: BookingDraft) => data)
  .handler(async ({ data }) => (await db()).createBooking(data));

/* ---------- public: customer prop requests ---------- */

export const createPropRequestFn = createServerFn({ method: "POST" })
  .inputValidator((data: PropRequestDraft) => data)
  .handler(async ({ data }) => (await db()).createPropRequest(data));

export const uploadRequestImageFn = createServerFn({ method: "POST" })
  .inputValidator((data: { fileName: string; contentType: string; base64: string }) => data)
  .handler(async ({ data }) =>
    (await db()).uploadRequestImage(data.fileName, data.contentType, data.base64),
  );

/* ---------- admin: prop requests ---------- */

export const fetchPropRequests = createServerFn({ method: "GET" }).handler(async () => {
  const m = await db();
  await m.assertAdmin();
  return m.listPropRequests();
});

export const updateRequestStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number; status: RequestStatus }) => data)
  .handler(async ({ data }) => {
    const m = await db();
    await m.assertAdmin();
    return m.updateRequestStatus(data.id, data.status);
  });

/* ---------- warehouse structure (public reads) ---------- */

export const fetchGodowns = createServerFn({ method: "GET" }).handler(async () =>
  (await db()).listGodowns(),
);

export const fetchRacks = createServerFn({ method: "GET" }).handler(async () =>
  (await db()).listRacks(),
);

/* ---------- rental orders (admin only) ---------- */

export const fetchRentalOrders = createServerFn({ method: "GET" }).handler(async () => {
  const m = await db();
  await m.assertAdmin();
  return m.listRentalOrders();
});

export const createRentalOrderFn = createServerFn({ method: "POST" })
  .inputValidator((data: RentalOrderDraft) => data)
  .handler(async ({ data }) => {
    const m = await db();
    await m.assertAdmin();
    return m.createRentalOrder(data);
  });

export const settleRentalOrderFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number; actual_return_date: string }) => data)
  .handler(async ({ data }) => {
    const m = await db();
    await m.assertAdmin();
    return m.settleRentalOrder(data.id, data.actual_return_date);
  });

export const cancelRentalOrderFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    const m = await db();
    await m.assertAdmin();
    return m.cancelRentalOrder(data.id);
  });
