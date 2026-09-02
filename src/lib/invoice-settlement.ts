/**
 * Client-issued (negotiated) amount sidecar.
 *
 * The invoice we submit shows the full balance payable, but clients often
 * negotiate the figure down before paying. That agreed amount is stored on the
 * saved billing record's notes as a single machine-readable line so no schema
 * change is needed.
 */
const LINE = /^Client-issued amount\s*:/i;

export function readClientIssued(notes?: string | null): {
  amount: number | null;
  rest: string;
} {
  if (!notes) return { amount: null, rest: "" };
  const lines = notes.split("\n");
  const idx = lines.findIndex((l) => LINE.test(l.trim()));
  if (idx === -1) return { amount: null, rest: notes.trim() };
  const raw = lines[idx]!.slice(lines[idx]!.indexOf(":") + 1).replace(/[^\d.]/g, "");
  const amount = Number(raw);
  const rest = lines.filter((_, i) => i !== idx).join("\n").trim();
  return { amount: Number.isFinite(amount) ? amount : null, rest };
}

/** Returns the notes string with the client-issued line set (or removed when null). */
export function writeClientIssued(notes: string | null | undefined, amount: number | null): string {
  const { rest } = readClientIssued(notes);
  if (amount === null) return rest;
  return [rest, `Client-issued amount: ${amount}`].filter(Boolean).join("\n");
}

/** A record locks once payment is fully settled. */
export function isInvoiceLocked(payment_status: string) {
  return payment_status === "Paid";
}
