import {
  acceptQuotationFn,
  adminAcceptQuotationFn,
  acceptQuoteFn,
  clientSessionFn,
  clientSignInFn,
  clientSignOutFn,
  clientSignUpFn,
  closeLabourInvoiceFn,
  closeSettlementFn,
  createQuoteRequestFn,
  dispatchQuoteFn,
  fetchAllQuotes,
  fetchClientAccounts,
  fetchClientDossier,
  fetchMyPayments,
  fetchMyProfile,
  fetchMyQuotes,
  fetchProductionHouses,
  priceQuoteFn,
  recordReturnFn,
  saveShootDaysFn,
  rejectQuoteFn,
  saveLabourSheetFn,
  saveMyProfileFn,
  setAdvanceRequiredFn,
  uploadPaymentProofFn,
  verifyAdvanceFn,
} from "./portal.functions";

import type {
  ClientAccountSummary,
  ClientDossier,
  ClientProfile,
  ProductionHouse,
  QuotePayment,
  QuoteRequest,
  QuoteRequestDraft,
  QuoteStatus,
} from "./types";

async function toBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export const portal = {
  session: () => clientSessionFn() as Promise<{ userId: string; email: string } | null>,
  signIn: (email: string, password: string) => clientSignInFn({ data: { email, password } }),
  signUp: (data: {
    email: string;
    password: string;
    production_house: string;
    contact_person: string;
    phone: string;
    designation?: string;
  }) => clientSignUpFn({ data }),
  signOut: () => clientSignOutFn(),

  getProfile: () => fetchMyProfile() as Promise<ClientProfile>,
  getProductionHouses: () => fetchProductionHouses() as Promise<ProductionHouse[]>,
  saveProfile: (data: Partial<ClientProfile>) => saveMyProfileFn({ data }),
  getMyQuotes: () => fetchMyQuotes() as Promise<QuoteRequest[]>,
  getMyPayments: () => fetchMyPayments() as Promise<QuotePayment[]>,
  requestQuote: (data: QuoteRequestDraft) =>
    createQuoteRequestFn({ data }) as Promise<QuoteRequest>,
  acceptQuotation: (id: number) => acceptQuotationFn({ data: { id } }),
  acceptQuote: (data: {
    id: number;
    payment_reference: string;
    payment_proof_path?: string | null;
    payment_mode?: string;
  }) => acceptQuoteFn({ data }),
  rejectQuote: (id: number) => rejectQuoteFn({ data: { id } }),

  uploadProof: async (file: File) =>
    uploadPaymentProofFn({
      data: {
        fileName: file.name,
        contentType: file.type || "image/jpeg",
        base64: await toBase64(file),
      },
    }),

  /* admin */
  getAllQuotes: () => fetchAllQuotes() as Promise<QuoteRequest[]>,
  getClientAccounts: () => fetchClientAccounts() as Promise<ClientAccountSummary[]>,
  getClientDossier: (userId: string) =>
    fetchClientDossier({ data: { userId } }) as Promise<ClientDossier>,
  adminAcceptQuotation: (data: { id: number; remark: string; channel?: string }) =>
    adminAcceptQuotationFn({ data }),
  setAdvanceRequired: (id: number, advance_required: number) =>
    setAdvanceRequiredFn({ data: { id, advance_required } }),
  priceQuote: (data: {
    id: number;
    items: { prop_id: number; daily_rate: number; quantity: number }[];
    security_deposit: number;
    advance_required: number;
    estimated_days: number;
    admin_notes?: string;
  }) => priceQuoteFn({ data }),
  verifyAdvance: (data: { id: number; amount_received?: number; mode?: string; utr?: string }) =>
    verifyAdvanceFn({ data }),
  dispatchQuote: (data: {
    id: number;
    vehicle?: string;
    notes?: string;
    crew_ids?: number[];
    crew_wages?: { staff_id: number; daily_wage: number }[];
  }) => dispatchQuoteFn({ data }),
  saveLabourSheet: (
    id: number,
    days: { date: string; workers: number; rate: number; note?: string }[],
  ) => saveLabourSheetFn({ data: { id, days } }),
  closeLabourInvoice: (id: number, amount: number) =>
    closeLabourInvoiceFn({ data: { id, amount } }),
  saveShootDays: (id: number, days: { date: string; note?: string }[]) =>
    saveShootDaysFn({ data: { id, days } }),
  recordReturn: (
    id: number,
    actual_return_date: string,
    shoot_days?: { date: string; note?: string }[],
  ) => recordReturnFn({ data: { id, actual_return_date, ...(shoot_days ? { shoot_days } : {}) } }),
  closeSettlement: (id: number, settled_amount?: number) =>
    closeSettlementFn({
      data: settled_amount == null ? { id } : { id, settled_amount },
    }),
};


export const portalKeys = {
  session: ["client-session"] as const,
  profile: ["client-profile"] as const,
  productionHouses: ["production-houses"] as const,
  myQuotes: ["client-quotes"] as const,
  myPayments: ["client-payments"] as const,
  allQuotes: ["admin-quotes"] as const,
  clientAccounts: ["admin-client-accounts"] as const,
  clientDossier: (userId: string) => ["admin-client-dossier", userId] as const,
};

export const QUOTE_LABEL: Record<QuoteStatus, string> = {
  quote_requested: "Quote Under Review",
  quote_sent: "Quote Ready — Action Needed",
  quote_accepted: "Accepted — Pay Advance",
  advance_submitted: "Advance Under Verification",
  payment_received: "Payment Received",
  dispatched: "Dispatched — On Rent",
  on_set: "Dispatched — On Rent",
  settled: "Returned & Settled",
  closed: "Paid & Order Closed",
  rejected: "Declined",
};

export const QUOTE_TONE: Record<QuoteStatus, string> = {
  quote_requested: "border-muted-foreground/40 bg-secondary text-muted-foreground",
  quote_sent: "border-primary/60 bg-primary/15 text-primary",
  quote_accepted: "border-primary/60 bg-primary/15 text-primary",
  advance_submitted: "border-accent/60 bg-accent/15 text-accent",
  payment_received: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  dispatched: "border-accent/60 bg-accent/15 text-accent",
  on_set: "border-accent/60 bg-accent/15 text-accent",
  settled: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  closed: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  rejected: "border-destructive/50 bg-destructive/10 text-destructive",
};

