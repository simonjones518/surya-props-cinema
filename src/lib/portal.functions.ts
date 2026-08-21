import { createServerFn } from "@tanstack/react-start";
import type { ClientProfile, QuoteRequestDraft } from "./types";

const db = () => import("./portal.server");
const admin = () => import("./inventory.server");

/* ---------- client auth ---------- */

export const clientSessionFn = createServerFn({ method: "GET" }).handler(async () =>
  (await db()).currentClient(),
);

export const clientSignUpFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      email: string;
      password: string;
      production_house: string;
      contact_person: string;
      phone: string;
      designation?: string;
    }) => data,
  )
  .handler(async ({ data }) => (await db()).clientSignUp(data));

export const clientSignInFn = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => (await db()).clientSignIn(data));

export const clientSignOutFn = createServerFn({ method: "POST" }).handler(async () =>
  (await db()).clientSignOut(),
);

/* ---------- client portal ---------- */

export const fetchMyProfile = createServerFn({ method: "GET" }).handler(async () =>
  (await db()).getProfile(),
);

export const fetchProductionHouses = createServerFn({ method: "GET" }).handler(async () =>
  (await db()).listProductionHouses(),
);

export const saveMyProfileFn = createServerFn({ method: "POST" })
  .inputValidator((data: Partial<ClientProfile>) => data)
  .handler(async ({ data }) => (await db()).saveProfile(data));

export const fetchMyQuotes = createServerFn({ method: "GET" }).handler(async () =>
  (await db()).listMyQuotes(),
);

export const fetchMyPayments = createServerFn({ method: "GET" }).handler(async () =>
  (await db()).listMyPayments(),
);

export const createQuoteRequestFn = createServerFn({ method: "POST" })
  .inputValidator((data: QuoteRequestDraft) => data)
  .handler(async ({ data }) => (await db()).createQuoteRequest(data));

export const uploadPaymentProofFn = createServerFn({ method: "POST" })
  .inputValidator((data: { fileName: string; contentType: string; base64: string }) => data)
  .handler(async ({ data }) =>
    (await db()).uploadPaymentProof(data.fileName, data.contentType, data.base64),
  );

export const acceptQuotationFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => (await db()).acceptQuotation(data.id));

export const acceptQuoteFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: number;
      payment_reference: string;
      payment_proof_path?: string | null;
      payment_mode?: string;
    }) => data,
  )
  .handler(async ({ data }) => (await db()).acceptQuote(data));

export const rejectQuoteFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => (await db()).rejectQuoteByClient(data.id));

/* ---------- admin approvals (guarded by the Admin ERP session) ---------- */

export const fetchAllQuotes = createServerFn({ method: "GET" }).handler(async () => {
  await (await admin()).assertAdmin();
  return (await db()).listAllQuotes();
});

export const priceQuoteFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: number;
      items: { prop_id: number; daily_rate: number; quantity: number }[];
      security_deposit: number;
      advance_required: number;
      estimated_days: number;
      admin_notes?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await (await admin()).assertAdmin();
    return (await db()).priceQuote(data);
  });

export const verifyAdvanceFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { id: number; amount_received?: number; mode?: string; utr?: string }) => data,
  )
  .handler(async ({ data }) => {
    await (await admin()).assertAdmin();
    return (await db()).verifyAdvance(data);
  });

export const recordReturnFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number; actual_return_date: string }) => data)
  .handler(async ({ data }) => {
    await (await admin()).assertAdmin();
    return (await db()).recordReturn(data);
  });

export const dispatchQuoteFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number; vehicle?: string; notes?: string }) => data)
  .handler(async ({ data }) => {
    await (await admin()).assertAdmin();
    return (await db()).dispatchQuote(data);
  });

export const closeSettlementFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    await (await admin()).assertAdmin();
    return (await db()).closeSettlement(data.id);
  });

