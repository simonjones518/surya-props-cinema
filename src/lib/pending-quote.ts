import type { QuoteRequestDraft } from "./types";

const KEY = "scp-pending-quote-draft";

/**
 * A quote request captured before sign-in. The client fills the wishlist form,
 * gets sent to /auth, and the draft is submitted automatically after login so
 * both actions (lifecycle record + WhatsApp alert) still fire.
 */
export function savePendingQuote(draft: QuoteRequestDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable — the client simply re-submits after login */
  }
}

export function readPendingQuote(): QuoteRequestDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QuoteRequestDraft) : null;
  } catch {
    return null;
  }
}

export function clearPendingQuote() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
