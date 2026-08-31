import { Link } from "@tanstack/react-router";
import { CalendarClock, FileText, Truck, Wallet } from "lucide-react";
import { inr } from "@/lib/format";
import type { QuoteRequest } from "@/lib/types";

/** Mobile dashboard summary for the client portal. */
export function ClientSummaryMobile({ quotes }: { quotes: QuoteRequest[] }) {
  const awaitingQuote = quotes.filter((q) => q.status === "quote_requested").length;
  const toPay = quotes
    .filter((q) => ["quote_sent", "quote_accepted"].includes(q.status))
    .reduce((sum, q) => sum + Math.max(q.advance_required - q.advance_paid, 0), 0);
  const onSet = quotes.filter((q) => ["dispatched", "on_set"].includes(q.status)).length;
  const balance = quotes
    .filter((q) => !["closed", "rejected"].includes(q.status))
    .reduce((sum, q) => sum + q.balance_due, 0);

  const tiles = [
    { icon: FileText, label: "Awaiting quote", value: String(awaitingQuote) },
    { icon: Wallet, label: "Advance due", value: inr(toPay) },
    { icon: Truck, label: "On set now", value: String(onSet) },
    { icon: CalendarClock, label: "Balance", value: inr(balance) },
  ] as const;

  return (
    <section aria-label="Portal summary" className="grid grid-cols-2 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-primary/20 bg-card p-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <p className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t.label}
            </p>
            <t.icon className="size-3.5 shrink-0 text-primary" />
          </div>
          <p className="mt-1 truncate font-display text-2xl tracking-wide">{t.value}</p>
        </div>
      ))}
      <Link
        to="/catalog"
        className="col-span-2 rounded-2xl border border-primary/40 bg-primary/10 p-3 text-center text-xs font-bold uppercase tracking-wider text-primary"
      >
        Browse catalog & build a wishlist
      </Link>
    </section>
  );
}
