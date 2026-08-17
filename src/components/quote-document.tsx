import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/format";
import type { QuoteRequest } from "@/lib/types";

export type QuoteDocKind = "quotation" | "challan" | "settlement";

const TITLES: Record<QuoteDocKind, string> = {
  quotation: "Estimated Rental Quotation",
  challan: "Dispatch Delivery Challan",
  settlement: "Final Settlement Invoice",
};

/** Print-ready non-GST cinema document. `challan` hides all pricing. */
export function QuoteDocument({ quote, kind }: { quote: QuoteRequest; kind: QuoteDocKind }) {
  const priced = kind !== "challan";
  const settlement = kind === "settlement";
  const billedDays = settlement ? (quote.actual_days_used ?? quote.estimated_days) : quote.estimated_days;
  const total = settlement ? quote.final_total : quote.estimated_total;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{TITLES[kind]}</p>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" /> Print / Save PDF
        </Button>
      </div>

      <article id="print-area" className="space-y-5 rounded-xl border border-primary/25 bg-card p-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="font-display text-2xl tracking-widest text-gradient-gold">
              SURYA CINE SPECIAL PROPS
            </h2>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              Chennai, India · Film Prop Rental
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl tracking-wide">{TITLES[kind]}</p>
            <p className="font-mono text-xs text-muted-foreground">{quote.quote_code}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(quote.created_at).toLocaleDateString("en-IN")}
            </p>
          </div>
        </header>

        <section className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <Field label="Production House" value={quote.production_house} />
            <Field label="Contact Person" value={quote.contact_person} />
            <Field label="Phone" value={quote.phone} />
          </div>
          <div>
            <Field label="Shoot Location" value={quote.shoot_location || "—"} />
            <Field label="Dispatch / Shoot Start" value={quote.shoot_start_date} />
            <Field
              label={settlement ? "Actual Return" : "Estimated Return"}
              value={(settlement ? quote.actual_return_date : quote.estimated_return_date) ?? "—"}
            />
            <Field label="Days Billed" value={String(billedDays)} />
          </div>
        </section>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2">Prop &amp; Configuration</th>
              <th className="py-2 text-center">Godown / Rack</th>
              <th className="py-2 text-center">Qty</th>
              {priced && <th className="py-2 text-right">Rate/Day</th>}
              {priced && <th className="py-2 text-right">Line Total</th>}
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item) => (
              <tr key={item.prop_id} className="border-b border-border/60 align-top">
                <td className="py-2 pr-3">
                  <span className="font-semibold">{item.prop_name}</span>
                  {item.prop_specs && (
                    <span className="text-muted-foreground"> ({item.prop_specs})</span>
                  )}
                  <span className="block font-mono text-[10px] text-muted-foreground">
                    {item.serial_number}
                  </span>
                </td>
                <td className="py-2 text-center text-xs text-muted-foreground">
                  {[item.godown_name, item.rack_name].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="py-2 text-center">{item.quantity}</td>
                {priced && <td className="py-2 text-right">{inr(item.daily_rate)}</td>}
                {priced && (
                  <td className="py-2 text-right font-semibold">
                    {inr(item.daily_rate * item.quantity * billedDays)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {priced ? (
          <section className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
            <Row label={`Rental Subtotal (${billedDays} day${billedDays > 1 ? "s" : ""})`} value={inr(total)} />
            <Row label="Security Deposit" value={inr(quote.security_deposit)} />
            <Row
              label={settlement ? "Advance Adjusted" : "Advance Required"}
              value={`− ${inr(settlement ? quote.advance_paid : quote.advance_required)}`}
            />
            <div className="flex items-center justify-between border-t border-primary/30 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {settlement ? "Net Balance Due" : "Estimated Balance"}
              </span>
              <span className="font-display text-2xl tracking-wide text-primary">
                {inr(
                  settlement
                    ? quote.balance_due
                    : total + quote.security_deposit - quote.advance_required,
                )}
              </span>
            </div>
            <p className="pt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Non-GST rental document
            </p>
          </section>
        ) : (
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Set copy — pricing intentionally omitted. Verify every item on dispatch and return.
          </p>
        )}

        {quote.admin_notes && (
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Notes: </span>
            {quote.admin_notes}
          </p>
        )}
      </article>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}: </span>
      <span className="font-semibold">{value}</span>
    </p>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
