import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { inr, prettyDate } from "@/lib/format";
import { COMPANY_INFO, RENTAL_TERMS, amountInWords, docNumber, upiPayload } from "@/lib/company";
import type { QuoteRequest } from "@/lib/types";

/** The five standardised rental documents. */
export type QuoteDocKind = "quotation" | "advance-request" | "receipt" | "challan" | "settlement";

const META: Record<QuoteDocKind, { title: string; prefix: "QTN" | "APR" | "RCP" | "DC" | "INV" }> = {
  quotation: { title: "Rental Estimate Quotation", prefix: "QTN" },
  "advance-request": { title: "Advance Payment Request Note", prefix: "APR" },
  receipt: { title: "Advance Money Receipt", prefix: "RCP" },
  challan: { title: "Dispatch & Delivery Challan", prefix: "DC" },
  settlement: { title: "Final Return & Settlement Invoice", prefix: "INV" },
};

export const DOC_LABEL: Record<QuoteDocKind, string> = {
  quotation: "Quotation",
  "advance-request": "Advance Request",
  receipt: "Advance Receipt",
  challan: "Delivery Challan",
  settlement: "Settlement Invoice",
};

function useUpiQr(amount: number, note: string, enabled: boolean) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || amount <= 0) {
      setSrc(null);
      return;
    }
    let alive = true;
    void QRCode.toDataURL(upiPayload(amount, note), { margin: 1, width: 220 })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [amount, note, enabled]);
  return src;
}

/** Print-ready non-GST cinema document. `challan` hides all pricing. */
export function QuoteDocument({ quote, kind }: { quote: QuoteRequest; kind: QuoteDocKind }) {
  const meta = META[kind];
  const priced = kind !== "challan";
  const settlement = kind === "settlement";
  const receipt = kind === "receipt";
  const advanceNote = kind === "advance-request";

  const billedDays = settlement ? (quote.actual_days_used ?? quote.estimated_days) : quote.estimated_days;
  const rentTotal = settlement ? quote.final_total : quote.estimated_total;
  const advanceDue = quote.advance_required;
  const advancePaid = quote.advance_paid;
  const balance = settlement
    ? quote.balance_due
    : rentTotal + quote.security_deposit - (advancePaid || advanceDue);

  const payNow = receipt ? advancePaid : advanceNote ? advanceDue : settlement ? quote.balance_due : 0;
  const qr = useUpiQr(payNow, `${quote.quote_code} ${DOC_LABEL[kind]}`, advanceNote || settlement);

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
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" /> Print / Save PDF
        </Button>
      </div>

      <article
        id="print-area"
        className="space-y-5 rounded-xl border border-primary/25 bg-card p-6 print:border-0 print:bg-white print:text-black"
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-primary/30 pb-4">
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

        <section className="grid gap-4 text-sm sm:grid-cols-2">
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
            <Field label="Days Billed" value={String(billedDays)} />
            {kind === "challan" && quote.dispatch_vehicle && (
              <Field label="Vehicle" value={quote.dispatch_vehicle} />
            )}
            {receipt && (
              <Field label="Payment Mode" value={`${quote.advance_mode ?? "UPI"}`} />
            )}
            {receipt && quote.advance_utr && <Field label="UTR / Ref" value={quote.advance_utr} />}
          </div>
        </section>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-primary/30 text-[10px] uppercase tracking-wider text-muted-foreground print:text-black">
              <th className="py-2">Prop &amp; Configuration</th>
              <th className="py-2 text-center">Godown / Rack</th>
              <th className="py-2 text-center">Qty</th>
              {priced && <th className="py-2 text-right">Rate/Day</th>}
              {priced && <th className="py-2 text-right">Line Total</th>}
              {kind === "challan" && <th className="py-2 text-center">Returned ✓</th>}
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item) => (
              <tr key={item.prop_id} className="border-b border-border/60 align-top">
                <td className="py-2 pr-3">
                  <span className="font-semibold">{item.prop_name}</span>
                  {item.prop_specs && (
                    <span className="text-muted-foreground print:text-black"> ({item.prop_specs})</span>
                  )}
                  <span className="block font-mono text-[10px] text-muted-foreground print:text-black">
                    {item.serial_number}
                  </span>
                </td>
                <td className="py-2 text-center text-xs text-muted-foreground print:text-black">
                  {[item.godown_name, item.rack_name].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="py-2 text-center">{item.quantity}</td>
                {priced && <td className="py-2 text-right">{inr(item.daily_rate)}</td>}
                {priced && (
                  <td className="py-2 text-right font-semibold">
                    {inr(item.daily_rate * item.quantity * billedDays)}
                  </td>
                )}
                {kind === "challan" && (
                  <td className="py-2 text-center text-muted-foreground print:text-black">☐</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {priced ? (
          <section className="ml-auto w-full max-w-sm space-y-1.5 text-sm">
            {receipt ? (
              <>
                <Row label="Rental Estimate" value={inr(rentTotal)} />
                <Row label="Security Deposit" value={inr(quote.security_deposit)} />
                <Total label="Advance Received" value={inr(advancePaid)} />
                <Row label="Balance Payable Later" value={inr(balance)} />
              </>
            ) : advanceNote ? (
              <>
                <Row label={`Rental Estimate (${billedDays} day(s))`} value={inr(rentTotal)} />
                <Row label="Security Deposit" value={inr(quote.security_deposit)} />
                <Total label="Advance Payable Now" value={inr(advanceDue)} />
              </>
            ) : (
              <>
                <Row label={`Rental Subtotal (${billedDays} day(s))`} value={inr(rentTotal)} />
                <Row label="Security Deposit" value={inr(quote.security_deposit)} />
                <Row
                  label={settlement ? "Advance Adjusted" : "Advance Required"}
                  value={`− ${inr(settlement ? advancePaid : advanceDue)}`}
                />
                <Total
                  label={settlement ? "Net Balance Due" : "Estimated Balance"}
                  value={inr(balance)}
                />
              </>
            )}
            <p className="pt-1 text-[11px] italic text-muted-foreground print:text-black">
              {amountInWords(receipt ? advancePaid : advanceNote ? advanceDue : balance)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground print:text-black">
              Non-GST rental document
            </p>
          </section>
        ) : (
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground print:text-black">
            Set copy — pricing intentionally omitted. Verify every item on dispatch and return.
          </p>
        )}

        {(advanceNote || settlement) && (
          <section className="flex flex-wrap items-center gap-5 border-t border-border pt-4">
            {qr && (
              <img
                src={qr}
                alt="UPI payment QR code"
                className="size-28 rounded-lg border border-primary/40 bg-white p-1 print:border-black"
              />
            )}
            <div className="text-[11px] leading-relaxed text-muted-foreground print:text-black">
              <p className="font-mono text-foreground print:text-black">UPI: {COMPANY_INFO.upiId}</p>
              <p>{COMPANY_INFO.accountName}</p>
              <p>
                {COMPANY_INFO.bankName} · A/C {COMPANY_INFO.accountNumber} · IFSC{" "}
                {COMPANY_INFO.ifsc}
              </p>
              <p className="mt-1 font-semibold text-primary print:text-black">
                Pay {inr(payNow)} and share the UTR / screenshot in your portal.
              </p>
            </div>
          </section>
        )}

        {quote.admin_notes && (
          <p className="border-t border-border pt-3 text-xs text-muted-foreground print:text-black">
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

        <section className="grid gap-6 border-t border-border pt-4 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary print:text-black">
              Rental Terms &amp; Conditions
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[10px] leading-relaxed text-muted-foreground print:text-black">
              {RENTAL_TERMS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col justify-end gap-6 text-center text-[11px] text-muted-foreground print:text-black">
            <div className="w-44 border-t border-dashed border-primary/50 pt-2 print:border-black">
              {kind === "challan" ? "Received By (Production)" : "Client Acknowledgement"}
            </div>
            <div className="w-44 border-t border-dashed border-primary/50 pt-2 print:border-black">
              For {COMPANY_INFO.name}
            </div>
          </div>
        </section>
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
