/** Admin WhatsApp desk — customer requests are handed off here after saving. */
export const ADMIN_WHATSAPP = "919849005451";

export function whatsappLink(message: string) {
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

/** Opens WhatsApp in a new tab with the request summary pre-filled. */
export function openWhatsApp(message: string) {
  if (typeof window === "undefined") return;
  window.open(whatsappLink(message), "_blank", "noopener,noreferrer");
}

/** Opens WhatsApp for an arbitrary recipient (e.g. the client's own number). */
export function openWhatsAppTo(phone: string, message: string) {
  if (typeof window === "undefined") return;
  const digits = phone.replace(/\D/g, "");
  const to = digits.length === 10 ? `91${digits}` : digits;
  if (!to) return openWhatsApp(message);
  window.open(`https://wa.me/${to}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

export type QuoteWhatsAppSummary = {
  quote_code: string;
  production_house: string;
  movie_name: string;
  contact_person: string;
  phone: string;
  shoot_start_date: string;
  estimated_return_date: string;
  estimated_days: number;
  items: { prop_name: string; quantity: number }[];
};

/** Admin-desk alert fired the moment a client submits a quote request. */
export function newQuoteRequestMessage(q: QuoteWhatsAppSummary) {
  const lines = q.items.map((i, n) => `${n + 1}. ${i.prop_name} (Qty: ${i.quantity})`).join("\n");
  return [
    "🎬 *NEW PROPS QUOTE REQUEST - Surya Cine Props*",
    "",
    `*Ref:* ${q.quote_code}`,
    `*Production:* ${q.production_house}`,
    `*Movie Project:* ${q.movie_name}`,
    `*Client:* ${q.contact_person} (${q.phone})`,
    `*Shoot Dates:* ${q.shoot_start_date} to ${q.estimated_return_date} (Est. ${q.estimated_days} Days)`,
    "",
    "*Requested Props:*",
    lines,
    "",
    "👉 View & Set Custom Pricing in Admin Portal",
  ].join("\n");
}

/** Client notification fired when the admin approves and sends a quotation. */
export function quotationReadyMessage(q: {
  quote_code: string;
  movie_name: string;
  contact_person: string;
  estimated_total: number;
  advance_required: number;
}) {
  const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  return [
    "🎬 *Surya Cine Special Props*",
    "",
    `Hi ${q.contact_person}, your Quotation for *${q.movie_name}* is ready for review.`,
    `*Ref:* ${q.quote_code}`,
    `*Estimated Total:* ${inr(q.estimated_total)}`,
    `*Advance Payable:* ${inr(q.advance_required)}`,
    "",
    "👉 Review, accept and upload your payment proof in your Client Portal.",
  ].join("\n");
}
