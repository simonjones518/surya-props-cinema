import { Check } from "lucide-react";
import type { QuoteRequest, QuoteStatus } from "@/lib/types";

/** Ordered workflow stages shared by the client portal and the Admin ERP. */
export const QUOTE_STAGES: { key: QuoteStatus; title: string; client: string; admin: string }[] = [
  {
    key: "quote_requested",
    title: "Request Sent",
    client: "Your prop list reached the Surya Cine desk.",
    admin: "Client requested a quotation — set rates.",
  },
  {
    key: "quote_sent",
    title: "Quotation Issued",
    client: "Rates & advance are ready — accept the quotation.",
    admin: "Quotation sent; awaiting client acceptance.",
  },
  {
    key: "quote_accepted",
    title: "Quote Accepted",
    client: "Pay the advance and share the UTR / screenshot.",
    admin: "Client accepted — advance payment request issued.",
  },
  {
    key: "advance_submitted",
    title: "Advance Submitted",
    client: "Payment reference/screenshot sent for verification.",
    admin: "Verify the UPI reference / payment proof.",
  },
  {
    key: "payment_received",
    title: "Payment Received",
    client: "Advance confirmed — money receipt available.",
    admin: "Advance verified — dispatch the props.",
  },
  {
    key: "dispatched",
    title: "Dispatched — On Rent",
    client: "Props are out on rent for your shoot.",
    admin: "Props on-set; record the return when they come back.",
  },
  {
    key: "settled",
    title: "Returned & Settled",
    client: "Final amount calculated on actual days used.",
    admin: "Settlement invoice generated.",
  },
  {
    key: "closed",
    title: "Paid & Closed",
    client: "Balance cleared — order closed.",
    admin: "Balance cleared; deposit refund can be released.",
  },
];


/** Legacy rows created before the dispatch stage existed. */
function normalize(status: QuoteStatus): QuoteStatus {
  return status === "on_set" ? "dispatched" : status;
}

export function stageIndex(status: QuoteStatus) {
  const s = normalize(status);
  const i = QUOTE_STAGES.findIndex((stage) => stage.key === s);
  return i === -1 ? 0 : i;
}

export function QuoteTimeline({ quote, side }: { quote: QuoteRequest; side: "client" | "admin" }) {
  if (quote.status === "rejected") {
    return (
      <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
        This request was declined — no further action is pending.
      </p>
    );
  }
  const current = stageIndex(quote.status);

  return (
    <ol className="mt-4 grid gap-3 rounded-lg border border-border bg-secondary/30 p-3 sm:grid-cols-3 lg:grid-cols-6">
      {QUOTE_STAGES.map((stage, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={stage.key} className="flex gap-2">
            <span
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${
                done
                  ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-400"
                  : active
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border bg-background text-muted-foreground"
              }`}
            >
              {done ? <Check className="size-3" /> : i + 1}
            </span>
            <span className="min-w-0">
              <span
                className={`block text-[11px] font-bold uppercase tracking-wider ${
                  active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {stage.title}
              </span>
              {active && (
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                  {side === "client" ? stage.client : stage.admin}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}