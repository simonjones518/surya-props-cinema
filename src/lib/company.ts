/** Single source of truth for letterhead, payment rails and document numbering. */
export const COMPANY_INFO = {
  name: "Surya Cine Special Props",
  tagline: "Where real props bring stories to life",
  warehouse:
    "Soundstage 4, Warehouse Block C, Poonamallee High Road, Chennai 600056, Tamil Nadu",
  phone: "+91 98490 05451",
  altPhone: "+91 98765 43210",
  email: "rentals@suryacineprops.in",
  upiId: "suryacineprops@upi",
  bankName: "HDFC Bank, Poonamallee High Road Branch",
  accountName: "Surya Cine Special Props",
  accountNumber: "50200078451236",
  ifsc: "HDFC0000452",
} as const;

export const RENTAL_TERMS = [
  "Props remain the property of Surya Cine Special Props at all times.",
  "Rental days are counted from the dispatch date to the actual return date, both inclusive.",
  "Final billing is recalculated on actual days used; the estimate is indicative only.",
  "Security deposit is refundable within 7 working days after return inspection.",
  "Any damage, loss or non-return is chargeable at the declared replacement valuation.",
  "Transport, loading and on-set handling are billed separately where applicable.",
  "Balance payable must be cleared before the deposit is released.",
];

/** SCP-QTN-2026-0042 style references, derived from the quote id (stable). */
export function docNumber(
  prefix: "QTN" | "APR" | "RCP" | "DC" | "INV",
  id: number,
  createdAt?: string,
) {
  const year = new Date(createdAt ?? Date.now()).getFullYear();
  const seq = String(id).padStart(4, "0");
  return prefix === "QTN" ? `SCP-QTN-${year}-${seq}` : `SCP-${prefix}-${seq}`;
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n]!;
  const t = TENS[Math.floor(n / 10)]!;
  const o = ONES[n % 10]!;
  return o ? `${t} ${o}` : t;
}

/** Indian numbering system, e.g. 125400 -> "One Lakh Twenty Five Thousand Four Hundred". */
export function amountInWords(value: number): string {
  const amount = Math.round(Math.abs(value));
  if (amount === 0) return "Zero Rupees Only";
  const parts: string[] = [];
  const push = (n: number, label: string) => {
    if (n > 0) parts.push(`${twoDigits(n)} ${label}`.trim());
  };
  push(Math.floor(amount / 10_000_000), "Crore");
  push(Math.floor((amount % 10_000_000) / 100_000), "Lakh");
  push(Math.floor((amount % 100_000) / 1000), "Thousand");
  push(Math.floor((amount % 1000) / 100), "Hundred");
  const rest = amount % 100;
  if (rest > 0) parts.push(twoDigits(rest));
  return `${parts.join(" ")} Rupees Only`;
}

/** UPI deep link used for the dynamic payment QR. */
export function upiPayload(amount: number, note: string) {
  const params = new URLSearchParams({
    pa: COMPANY_INFO.upiId,
    pn: COMPANY_INFO.accountName,
    am: String(Math.max(0, Math.round(amount))),
    cu: "INR",
    tn: note.slice(0, 60),
  });
  return `upi://pay?${params.toString()}`;
}
