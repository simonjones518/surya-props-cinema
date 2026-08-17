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
