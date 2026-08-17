import { Printer, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inr, addDays, prettyDate } from "@/lib/format";
import type { Invoice } from "@/lib/types";

export const COMPANY = {
  name: "Surya Cine Special Props",
  tagline: "Where real props bring stories to life",
  gstin: "33ABCDS1234E1Z9",
  phone: "+91 98765 43210",
  email: "rentals@suryacineprops.in",
  address: "Soundstage 4, Warehouse Block C, Poonamallee High Road, Chennai 600056",
  upi: "suryacineprops@upi",
  bank: "Surya Cine Special Props · HDFC Bank · A/C 50200XXXXXX · IFSC HDFC0000XXX",
};

const TERMS = [
  "Props remain the property of Surya Cine Special Props at all times.",
  "Security deposit is refundable within 7 working days after return inspection.",
  "Any damage, loss or non-return is chargeable at the declared replacement valuation.",
  "Rental days are counted from the shoot start date to the wrap date, both inclusive.",
  "Transport, loading and on-set handling charges are billed separately where applicable.",
  "Balance payable must be settled before the props leave the warehouse.",
];

export function InvoiceDocument({ invoice, onClose }: { invoice: Invoice; onClose?: () => void }) {
  const isQuote = invoice.doc_type === "QUOTATION";
  const netRent = invoice.subtotal - invoice.discount + invoice.transport_charges;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-3 print:hidden">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            <X className="size-4" /> Close
          </Button>
        )}
        <Button onClick={() => window.print()}>
          <Printer className="size-4" /> Print / Save as PDF
        </Button>
      </div>

      <article
        id="print-area"
        className="mx-auto w-full max-w-4xl rounded-xl border border-primary/25 bg-card p-6 text-foreground sm:p-9 print:border-0 print:bg-white print:text-black"
      >
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-primary/30 pb-6">
          <div>
            <h2 className="font-display text-3xl tracking-wide text-gradient-gold print:text-black">
              {COMPANY.name}
            </h2>
            <p className="mt-1 text-xs uppercase tracking-[0.28em] text-primary print:text-black">
              {COMPANY.tagline}
            </p>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground print:text-black">
              {COMPANY.address}
            </p>
            <p className="mt-1 text-xs text-muted-foreground print:text-black">
              GSTIN {COMPANY.gstin} · {COMPANY.phone} · {COMPANY.email}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl tracking-[0.2em] text-primary print:text-black">
              {isQuote ? "QUOTATION" : "GST TAX & RENTAL INVOICE"}
            </p>
            <dl className="mt-3 space-y-1 text-xs">
              <Meta label={isQuote ? "Quote No" : "Invoice No"} value={invoice.invoice_number} mono />
              <Meta label="Date" value={prettyDate(invoice.created_at)} />
              <Meta
                label={isQuote ? "Valid Until" : "Return Due"}
                value={prettyDate(isQuote ? addDays(invoice.created_at.slice(0, 10), 15) : invoice.shoot_wrap_date)}
              />
              <Meta label="Booking Code" value={invoice.invoice_number.replace(/^SCP-(INV|QT)/, "SCP-BK")} mono />
            </dl>
          </div>
        </header>

        <section className="grid gap-6 border-b border-border py-6 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary print:text-black">Bill To</p>
            <p className="mt-2 font-semibold">{invoice.production_house || invoice.client_name}</p>
            <p className="text-sm text-muted-foreground print:text-black">Attn: {invoice.client_name}</p>
            <p className="text-sm text-muted-foreground print:text-black">{invoice.client_phone}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary print:text-black">
              Shoot Schedule
            </p>
            <p className="mt-2 text-sm">
              {prettyDate(invoice.shoot_start_date)} → {prettyDate(invoice.shoot_wrap_date)}
            </p>
            <p className="text-sm text-muted-foreground print:text-black">
              Location: {invoice.shoot_location || "As advised by production"}
            </p>
          </div>
        </section>

        <section className="overflow-x-auto py-6">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-primary/30 text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground print:text-black">
                <th className="py-2 pr-3">Serial No</th>
                <th className="py-2 pr-3">Prop Description</th>
                <th className="py-2 pr-3">Condition</th>
                <th className="py-2 pr-3 text-right">Qty</th>
                <th className="py-2 pr-3 text-right">Days</th>
                <th className="py-2 pr-3 text-right">Rate/Day</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((i, idx) => (
                <tr key={`${i.prop_id}-${idx}`} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-mono text-xs text-primary print:text-black">{i.serial_number || "—"}</td>
                  <td className="py-2 pr-3">{i.prop_name}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground print:text-black">{i.condition_rating}</td>
                  <td className="py-2 pr-3 text-right">{i.quantity}</td>
                  <td className="py-2 pr-3 text-right">{i.number_of_days}</td>
                  <td className="py-2 pr-3 text-right">{inr(i.custom_daily_rate)}</td>
                  <td className="py-2 text-right font-semibold">{inr(i.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="ml-auto max-w-sm space-y-1.5 border-t border-primary/30 pt-5 text-sm">
          <Row label="Subtotal" value={inr(invoice.subtotal)} />
          {invoice.discount > 0 && <Row label="Discount" value={`− ${inr(invoice.discount)}`} />}
          <Row label="Transport / Packaging" value={inr(invoice.transport_charges)} />
          <Row label={`GST @ ${invoice.gst_percent}%`} value={inr(invoice.gst_amount)} />
          <Row label="Taxable Rental Value" value={inr(netRent + invoice.gst_amount)} />
          <Row label="Security Deposit (Held)" value={inr(invoice.security_deposit)} />
          <Row label="Advance Received" value={`− ${inr(invoice.advance_received)}`} />
          <div className="mt-3 flex items-center justify-between rounded-lg border border-primary/45 bg-primary/10 px-3 py-2.5 print:border-black print:bg-transparent">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary print:text-black">
              Net Balance Payable
            </span>
            <span className="font-display text-2xl tracking-wide text-primary print:text-black">
              {inr(invoice.balance_payable)}
            </span>
          </div>
        </section>

        <section className="mt-8 grid gap-6 border-t border-border pt-6 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary print:text-black">
              Rental Terms &amp; Conditions
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-muted-foreground print:text-black">
              {TERMS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
            <p className="mt-3 text-[11px] text-muted-foreground print:text-black">{COMPANY.bank}</p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="grid size-28 place-items-center rounded-lg border border-primary/40 bg-background print:border-black print:bg-white">
              <QrCode className="size-20 text-primary print:text-black" />
            </div>
            <p className="font-mono text-[11px] text-foreground print:text-black">UPI: {COMPANY.upi}</p>
            <div className="mt-4 w-44 border-t border-dashed border-primary/50 pt-2 text-center text-[11px] text-muted-foreground print:border-black print:text-black">
              Authorised Signatory
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-end gap-3">
      <dt className="text-muted-foreground print:text-black">{label}</dt>
      <dd className={mono ? "font-mono text-foreground print:text-black" : "text-foreground print:text-black"}>
        {value}
      </dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground print:text-black">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}