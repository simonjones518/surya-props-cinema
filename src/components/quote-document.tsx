import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { inr, prettyDate } from "@/lib/format";
import { COMPANY_INFO, amountInWords, docNumber } from "@/lib/company";
import {
  PaymentCards,
  SignatureStrip,
  SummaryCard,
  TermsCard,
} from "@/components/document-blocks";
import type { QuoteRequest } from "@/lib/types";

/** The five standardised rental documents. */
export type QuoteDocKind =
  | "quotation"
  | "advance-request"
  | "receipt"
  | "challan"
  | "settlement"
  | "labour";

const META: Record<
  QuoteDocKind,
  { title: string; prefix: "QTN" | "APR" | "RCP" | "DC" | "INV" | "LAB" }
> = {
  quotation: { title: "Rental Estimate Quotation", prefix: "QTN" },
  "advance-request": { title: "Advance Payment Request Note", prefix: "APR" },
  receipt: { title: "Advance Money Receipt", prefix: "RCP" },
  challan: { title: "Dispatch & Delivery Challan", prefix: "DC" },
  settlement: { title: "Props Rental Invoice", prefix: "INV" },
  labour: { title: "Crew Daily Labour Invoice", prefix: "LAB" },
};

export const DOC_LABEL: Record<QuoteDocKind, string> = {
  quotation: "Quotation",
  "advance-request": "Advance Request",
  receipt: "Advance Receipt",
  challan: "Delivery Challan",
  settlement: "Props Rental Invoice",
  labour: "Labour Invoice",
};

/**
 * Crew daily labour invoice — billed completely separately from the prop
 * rental invoice, day one to closing day, with a per-day worker rate.
 */
function LabourInvoice({ quote }: { quote: QuoteRequest }) {
  const closed = quote.labour_status === "closed";
  const payable = closed ? quote.labour_settled_amount : quote.labour_total;
  const docNo =
    quote.labour_invoice_no ?? docNumber("LAB", quote.id, quote.dispatch_at ?? quote.created_at);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
          Crew Daily Labour Invoice
        </p>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" /> Print / Save PDF
        </Button>
      </div>

      <article
        id="print-area"
        className="space-y-2 rounded-xl border border-primary/25 bg-card p-4 print:border-0 print:bg-white print:text-black"
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-primary/30 pb-3">
          <div>
            <BrandLogo className="h-16" />
            <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-primary print:text-black">
              {COMPANY_INFO.tagline}
            </p>
            <p className="mt-2 max-w-xs text-[11px] leading-relaxed text-muted-foreground print:text-black">
              {COMPANY_INFO.warehouse}
            </p>
            <p className="text-[11px] text-muted-foreground print:text-black">
              {COMPANY_INFO.phone} · {COMPANY_INFO.email}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl tracking-wide text-primary print:text-black">
              Crew Daily Labour Invoice
            </p>
            <p className="font-mono text-xs text-foreground print:text-black">{docNo}</p>
            <p className="text-xs text-muted-foreground print:text-black">
              Dated {prettyDate(quote.actual_return_date ?? quote.created_at)}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground print:text-black">
              Ref {quote.quote_code}
            </p>
          </div>
        </header>

        <section className="grid gap-x-4 gap-y-0.5 text-sm sm:grid-cols-2">
          <div>
            <Field label="Movie / Project" value={quote.movie_name || "—"} />
            <Field label="Production House" value={quote.production_house} />
            <Field
              label="Attn"
              value={
                quote.client_designation
                  ? `${quote.contact_person} — ${quote.client_designation}`
                  : quote.contact_person
              }
            />
            <Field label="Phone" value={quote.phone} />
          </div>
          <div>
            <Field label="Shoot Location" value={quote.shoot_location || "—"} />
            <Field
              label="Deployment From"
              value={prettyDate(quote.dispatch_at ?? quote.shoot_start_date)}
            />
            <Field
              label="Closing Day"
              value={prettyDate(quote.actual_return_date ?? quote.estimated_return_date)}
            />
            <Field
              label="Crew Deployed"
              value={
                quote.crew_assignments.length > 0
                  ? quote.crew_assignments.map((c) => c.staff_name).join(", ")
                  : "—"
              }
            />
          </div>
        </section>


        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-primary/30 text-[10px] uppercase tracking-wider text-muted-foreground print:text-black">
              <th className="py-2">Date</th>
              <th className="py-2">Workers On Field / Shift / Rate</th>
              <th className="py-2 text-center">Head-count</th>
              <th className="py-2 text-right">Day Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.labour_days.map((d, i) => (
              <tr key={`${d.date}-${i}`} className="border-b border-border/60 align-top">
                <td className="py-2">
                  Day {i + 1}
                  <span className="block text-[10px] text-muted-foreground print:text-black">
                    {prettyDate(d.date)}
                  </span>
                  {d.note && (
                    <span className="block text-[10px] text-muted-foreground print:text-black">
                      {d.note}
                    </span>
                  )}
                </td>
                <td className="py-2 text-xs">
                  {(d.crew ?? []).length > 0
                    ? (d.crew ?? []).map((w) => (
                        <span key={w.staff_id} className="block">
                          {w.staff_name} — {w.shift === "night" ? "Overnight Shift" : "Regular Shift"}{" "}
                          — {inr(w.daily_wage)}
                        </span>
                      ))
                    : `${d.workers} × ${inr(d.rate)}`}
                  {Number(d.extra) > 0 && (
                    <span className="block">Overtime / extra — {inr(Number(d.extra))}</span>
                  )}
                </td>
                <td className="py-2 text-center">{d.workers}</td>
                <td className="py-2 text-right font-semibold">{inr(d.amount)}</td>
              </tr>
            ))}
            {quote.labour_days.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-xs text-muted-foreground">
                  No labour days entered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>



        <div className="mt-2 space-y-2 border-t border-border pt-2">
          <SummaryCard
            rows={[
              { label: "Labour Charges Raised:", value: inr(quote.labour_total) },
              ...(closed
                ? [
                    { label: "Production Approved:", value: inr(quote.labour_settled_amount) },
                    {
                      label: "Concession Allowed:",
                      value: `− ${inr(Math.max(0, quote.labour_total - quote.labour_settled_amount))}`,
                    },
                  ]
                : []),
            ]}
            netLabel={closed ? "Amount Settled" : "Labour Payable"}
            netValue={inr(payable)}
            words={amountInWords(payable)}
          />
          <PaymentCards
            payLine={payable > 0 ? `Pay ${inr(payable)} and share the UTR / screenshot.` : undefined}
          />
          <TermsCard text="Labour charges cover on-set handling, loading, unloading and set-up by the deployed crew for the dates listed above. Overtime beyond 12 hours a day is chargeable separately. Prop rental is billed separately." />
          <SignatureStrip clientLabel="Client Signature" />
        </div>

      </article>
    </div>
  );
}

/** Print-ready non-GST cinema document. `challan` hides all pricing. */
export function QuoteDocument({ quote, kind }: { quote: QuoteRequest; kind: QuoteDocKind }) {
  if (kind === "labour") return <LabourInvoice quote={quote} />;
  const meta = META[kind];
  const priced = kind !== "challan";
  const settlement = kind === "settlement";
  const receipt = kind === "receipt";
  const advanceNote = kind === "advance-request";

  /** Shooting days are the billing basis; the custody window is informational. */
  const shootDays = quote.shoot_days ?? [];
  const billedDays =
    shootDays.length > 0
      ? shootDays.length
      : settlement
        ? (quote.actual_days_used ?? quote.estimated_days)
        : quote.estimated_days;
  const rentTotal = settlement ? quote.final_total : quote.estimated_total;
  /** Line totals show one day only; the duration multiplier is shown in the summary. */
  const perDaySubtotal = quote.items.reduce(
    (sum, item) => sum + item.daily_rate * item.quantity,
    0,
  );
  const advanceDue = quote.advance_required;
  const advancePaid = quote.advance_paid;
  const balance = settlement
    ? quote.balance_due
    : rentTotal + quote.security_deposit - (advancePaid || advanceDue);

  const payNow = advanceNote ? advanceDue : settlement ? quote.balance_due : 0;
  const qrAmount = payNow > 0 ? payNow : balance;
  /** A receipt acknowledges money already received — it must never ask for payment. */



  const [showShootDays, setShowShootDays] = useState(true);

  const docNo =
    receipt && quote.advance_receipt_no
      ? quote.advance_receipt_no
      : docNumber(meta.prefix, quote.id, quote.created_at);

  const docDate =
    receipt
      ? (quote.advance_verified_at ?? quote.created_at)
      : kind === "challan"
        ? (quote.dispatch_at ?? quote.created_at)
        : settlement
          ? (quote.actual_return_date ?? quote.created_at)
          : quote.created_at;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{meta.title}</p>
        <div className="flex flex-wrap items-center gap-3">
          {shootDays.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showShootDays}
                onChange={(e) => setShowShootDays(e.target.checked)}
                className="size-4 accent-primary"
              />
              Show Shoot Days Chargeable
            </label>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> Print / Save PDF
          </Button>
        </div>
      </div>

      <article
        id="print-area"
        className="space-y-2 rounded-xl border border-primary/25 bg-card p-4 print:border-0 print:bg-white print:text-black"
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-primary/30 pb-3">
          <div>
            <BrandLogo className="h-16" />
            <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-primary print:text-black">
              {COMPANY_INFO.tagline}
            </p>
            <p className="mt-2 max-w-xs text-[11px] leading-relaxed text-muted-foreground print:text-black">
              {COMPANY_INFO.warehouse}
            </p>
            <p className="text-[11px] text-muted-foreground print:text-black">
              {COMPANY_INFO.phone} · {COMPANY_INFO.email}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl tracking-wide text-primary print:text-black">
              {meta.title}
            </p>
            <p className="font-mono text-xs text-foreground print:text-black">{docNo}</p>
            <p className="text-xs text-muted-foreground print:text-black">
              Dated {prettyDate(docDate)}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground print:text-black">
              Ref {quote.quote_code}
            </p>
          </div>
        </header>

        <section className="grid gap-x-4 gap-y-0.5 text-sm sm:grid-cols-2">
          <div>
            <Field label="Movie / Project" value={quote.movie_name || "—"} />
            <Field label="Production House" value={quote.production_house} />
            <Field
              label="Attn"
              value={
                quote.client_designation
                  ? `${quote.contact_person} — ${quote.client_designation}`
                  : quote.contact_person
              }
            />
            <Field label="Phone" value={quote.phone} />
          </div>
          <div>
            <Field label="Shoot Location" value={quote.shoot_location || "—"} />
            <Field
              label="Dispatch / Shoot Start"
              value={prettyDate(quote.dispatch_at ?? quote.shoot_start_date)}
            />
            <Field
              label={settlement ? "Actual Return" : "Estimated Return"}
              value={prettyDate(
                (settlement ? quote.actual_return_date : quote.estimated_return_date) ?? "",
              )}
            />
            <Field
              label="Shooting Days Billed"
              value={`${billedDays} day(s)${shootDays.length > 0 ? "" : " (estimated)"}`}
            />
            {kind === "challan" && quote.dispatch_vehicle && (
              <Field label="Vehicle" value={quote.dispatch_vehicle} />
            )}
            {kind === "challan" && (
              <Field
                label="Crew Deployed"
                value={
                  quote.crew_assignments.length > 0
                    ? quote.crew_assignments
                        .map((c) => `${c.staff_name} (${c.staff_code})`)
                        .join(", ")
                    : "—"
                }
              />
            )}

            {receipt && (
              <Field label="Payment Mode" value={`${quote.advance_mode ?? "UPI"}`} />
            )}
            {receipt && quote.advance_utr && <Field label="UTR / Ref" value={quote.advance_utr} />}
          </div>
        </section>

        {showShootDays && shootDays.length > 0 && (
          <section className="rounded-lg border border-primary/25 px-3 py-2 print:border-black">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary print:text-black">
              Shooting Days Chargeable ({shootDays.length})
            </p>
            <p className="mt-1 text-xs leading-relaxed text-foreground print:text-black">
              Shooting days: {shootDays.map((d) => prettyDate(d.date)).join(", ")}. For these{" "}
              {shootDays.length} day(s) only we charge it. Dispatch and return dates are recorded
              for custody of the props and are not billed.
            </p>
          </section>
        )}

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-primary/30 text-[10px] uppercase tracking-wider text-muted-foreground print:text-black">
              <th className="w-12 py-1 text-center">S.No</th>
              <th className="py-1">Prop Name</th>
              <th className="w-12 py-1 text-center">Qty</th>
              {priced && <th className="w-24 py-1 text-right">Rate/Day</th>}
              {priced && <th className="w-28 py-1 text-right">Line Total / Day</th>}
              {kind === "challan" && <th className="w-20 py-1 text-center">Returned ✓</th>}
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, idx) => (
              <tr key={item.prop_id}>
                <td className="py-0.5 text-center font-mono text-[11px]">{idx + 1}</td>
                <td className="py-0.5 pr-3 font-medium leading-tight">
                  {item.prop_name}
                  {item.serial_number && (
                    <span className="block font-mono text-[10px] text-muted-foreground print:text-black">
                      {item.serial_number}
                    </span>
                  )}
                </td>
                <td className="py-0.5 text-center">{item.quantity}</td>
                {priced && <td className="py-0.5 text-right">{inr(item.daily_rate)}</td>}
                {priced && (
                  <td className="py-0.5 text-right font-semibold">
                    {inr(item.daily_rate * item.quantity)}
                  </td>
                )}
                {kind === "challan" && (
                  <td className="py-0.5 text-center text-muted-foreground print:text-black">☐</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-primary/30 print:border-black" />

        {priced ? (
          <div className="space-y-2">
            {receipt ? (
              <SummaryCard
                rows={[
                  { label: "Rental Estimate:", value: inr(rentTotal) },
                  { label: "Security Deposit:", value: inr(quote.security_deposit) },
                  { label: "Balance Payable Later:", value: inr(balance) },
                ]}
                netLabel="Advance Received"
                netValue={inr(advancePaid)}
                words={amountInWords(advancePaid)}
              />
            ) : advanceNote ? (
              <SummaryCard
                rows={[
                  { label: "Per Day Total:", value: inr(perDaySubtotal) },
                  { label: "Total Days:", value: `${billedDays} Days` },
                ]}
                grand={{
                  label: `Grand Total (${inr(perDaySubtotal)} × ${billedDays} Days)`,
                  value: inr(rentTotal),
                }}
                deductions={[
                  { label: "(+) Security Deposit:", value: inr(quote.security_deposit) },
                ]}
                netLabel="Advance Payable Now"
                netValue={inr(advanceDue)}
                words={amountInWords(advanceDue)}
              />
            ) : (
              <SummaryCard
                rows={[
                  { label: "Per Day Total:", value: inr(perDaySubtotal) },
                  { label: "Total Days:", value: `${billedDays} Days` },
                ]}
                grand={{
                  label: `Grand Total (${inr(perDaySubtotal)} × ${billedDays} Days)`,
                  value: inr(rentTotal),
                }}
                deductions={[
                  { label: "(+) Security Deposit:", value: inr(quote.security_deposit) },
                  {
                    label: settlement ? "(-) Advance Amount:" : "(-) Advance Required:",
                    value: inr(settlement ? advancePaid : advanceDue),
                  },
                ]}
                netLabel={settlement ? "Net Payable Amount" : "Estimated Balance"}
                netValue={inr(balance)}
                postRows={
                  settlement && quote.status === "closed"
                    ? [
                        { label: "Client-Issued Amount:", value: inr(quote.settled_amount) },
                        {
                          label: "Concession Allowed:",
                          value: `− ${inr(quote.settlement_waived)}`,
                        },
                      ]
                    : []
                }
                words={amountInWords(balance)}
              />
            )}

            <PaymentCards
              showQr={!receipt}
              payLine={
                !receipt && qrAmount > 0
                  ? `Pay ${inr(qrAmount)} and share the UTR / screenshot.`
                  : undefined
              }
            />
          </div>
        ) : (
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground print:text-black">
            Set copy — pricing intentionally omitted. Verify every item on dispatch and return.
          </p>
        )}

        {quote.admin_notes && (
          <p className="text-xs text-muted-foreground print:text-black">
            <span className="font-semibold text-foreground print:text-black">Notes: </span>
            {quote.admin_notes}
          </p>
        )}
        {kind === "challan" && quote.dispatch_notes && (
          <p className="text-xs text-muted-foreground print:text-black">
            <span className="font-semibold text-foreground print:text-black">Dispatch notes: </span>
            {quote.dispatch_notes}
          </p>
        )}

        <TermsCard />
        <SignatureStrip
          clientLabel={kind === "challan" ? "Received By (Production)" : "Client Signature"}
        />

      </article>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground print:text-black">
        {label}:{" "}
      </span>
      <span className="font-semibold">{value}</span>
    </p>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground print:text-black">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-primary/30 pt-2 print:border-black">
      <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      <span className="font-display text-2xl tracking-wide text-primary print:text-black">
        {value}
      </span>
    </div>
  );
}
