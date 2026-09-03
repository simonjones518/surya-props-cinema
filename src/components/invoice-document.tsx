import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { inr, prettyDate } from "@/lib/format";
import { COMPANY_INFO, amountInWords } from "@/lib/company";
import upiQrAsset from "@/assets/upi-qr.jpeg.asset.json";
import { readClientIssued } from "@/lib/invoice-settlement";
import type { Invoice } from "@/lib/types";

export const COMPANY = {
  name: COMPANY_INFO.name,
  tagline: COMPANY_INFO.tagline,
  phone: COMPANY_INFO.phone,
  email: COMPANY_INFO.email,
  address: COMPANY_INFO.warehouse,
  upi: COMPANY_INFO.upiId,
  bank: `${COMPANY_INFO.accountName} · ${COMPANY_INFO.bankName} · A/C ${COMPANY_INFO.accountNumber} · IFSC ${COMPANY_INFO.ifsc}`,
};

/** Shooting dates are stored on the saved record's notes line by the direct-invoice flow. */
function extractShootDays(notes?: string) {
  if (!notes) return { dates: [] as string[], rest: "" };
  const lines = notes.split("\n");
  const idx = lines.findIndex((l) => /^Shooting days billed/i.test(l.trim()));
  if (idx === -1) return { dates: [], rest: notes.trim() };
  const line = lines[idx]!;
  const after = line.slice(line.indexOf(":") + 1);
  const dates = after
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  const rest = lines.filter((_, i) => i !== idx).join("\n").trim();
  return { dates, rest };
}

function useUpiQr(amount: number, note: string) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (amount <= 0) {
      setSrc(null);
      return;
    }
    let alive = true;
    void Promise.resolve(upiQrAsset.url)
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [amount, note]);
  return src;
}

export function InvoiceDocument({ invoice, onClose }: { invoice: Invoice; onClose?: () => void }) {
  const isQuote = invoice.doc_type === "QUOTATION";
  const title = isQuote ? "Rental Estimate Quotation" : "Props Rental Invoice";

  const { dates: shootDates, rest: rawNotes } = extractShootDays(invoice.notes);
  const { amount: issued, rest: notes } = readClientIssued(rawNotes);
  const billedDays = shootDates.length > 0 ? shootDates.length : (invoice.items[0]?.number_of_days ?? 0);
  /** Line totals are per-day only; the duration multiplier lives in the summary. */
  const perDaySubtotal = invoice.items.reduce(
    (sum, i) => sum + i.custom_daily_rate * i.quantity,
    0,
  );
  const qr = useUpiQr(invoice.balance_payable, `${invoice.invoice_number} ${title}`);
  const [showShootDays, setShowShootDays] = useState(true);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{title}</p>
        <div className="flex flex-wrap items-center gap-3">
          {shootDates.length > 0 && (
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
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="size-4" /> Close
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> Print / Save PDF
          </Button>
        </div>
      </div>

      <article
        id="print-area"
        className="space-y-3 rounded-xl border border-primary/25 bg-card p-6 print:border-0 print:bg-white print:text-black"
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
            <p className="font-display text-xl tracking-wide text-primary print:text-black">{title}</p>
            <p className="font-mono text-xs text-foreground print:text-black">{invoice.invoice_number}</p>
            <p className="text-xs text-muted-foreground print:text-black">
              Dated {prettyDate(invoice.created_at)}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground print:text-black">
              Ref {invoice.invoice_number.replace(/^SCP-(INV|QTN|QT)/, "SCP-BK")}
            </p>
          </div>
        </header>

        <section className="grid gap-x-4 gap-y-0.5 text-sm sm:grid-cols-2">
          <div>
            <Field label="Production House" value={invoice.production_house || invoice.client_name} />
            <Field label="Attn" value={invoice.client_name} />
            <Field label="Phone" value={invoice.client_phone} />
          </div>
          <div>
            <Field label="Shoot Location" value={invoice.shoot_location || "—"} />
            <Field label="Dispatch / Shoot Start" value={prettyDate(invoice.shoot_start_date)} />
            <Field
              label={isQuote ? "Estimated Return" : "Actual Return"}
              value={prettyDate(invoice.shoot_wrap_date)}
            />
            <Field label="Shooting Days Billed" value={`${billedDays} day(s)`} />
          </div>
        </section>

        {showShootDays && shootDates.length > 0 && (
          <section className="rounded-lg border border-primary/25 px-3 py-2 print:border-black">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary print:text-black">
              Shooting Days Chargeable ({shootDates.length})
            </p>
            <p className="mt-1 text-xs leading-relaxed text-foreground print:text-black">
              Shooting days: {shootDates.map((d) => prettyDate(d)).join(", ")}. For these{" "}
              {shootDates.length} day(s) only we charge it. Dispatch and return dates are recorded for
              custody of the props and are not billed.
            </p>
          </section>
        )}

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-primary/30 text-[10px] uppercase tracking-wider text-muted-foreground print:text-black">
              <th className="w-12 py-1 text-center">S.No</th>
              <th className="py-1">Prop Name</th>
              <th className="w-12 py-1 text-center">Qty</th>
              <th className="w-24 py-1 text-right">Rate/Day</th>
              <th className="w-28 py-1 text-right">Line Total / Day</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((i, idx) => (
              <tr key={`${i.prop_id}-${idx}`}>
                <td className="py-0.5 text-center font-mono text-[11px]">{idx + 1}</td>
                <td className="py-0.5 pr-3 font-medium leading-tight">
                  {i.prop_name}
                  {i.serial_number && (
                    <span className="block font-mono text-[10px] text-muted-foreground print:text-black">
                      {i.serial_number}
                    </span>
                  )}
                </td>
                <td className="py-0.5 text-center">{i.quantity}</td>
                <td className="py-0.5 text-right">{inr(i.custom_daily_rate)}</td>
                <td className="py-0.5 text-right font-semibold">
                  {inr(i.custom_daily_rate * i.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-primary/30 print:border-black" />

        <section className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="rounded-lg border border-primary/40 p-3 print:border-black">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary print:text-black">
              Payment Details
            </p>
            <div className="mt-2 flex items-start gap-3">
              {qr && (
                <img
                  src={qr}
                  alt="UPI payment QR code"
                  className="size-20 shrink-0 rounded-md border border-primary/40 bg-white p-1 print:border-black"
                />
              )}
              <div className="text-[11px] leading-snug text-muted-foreground print:text-black">
                <p className="font-mono text-foreground print:text-black">UPI: {COMPANY_INFO.upiId}</p>
                <p>{COMPANY_INFO.accountName}</p>
                <p>{COMPANY_INFO.bankName}</p>
                <p>
                  A/C {COMPANY_INFO.accountNumber} · IFSC {COMPANY_INFO.ifsc}
                </p>
                <p>Branch: {COMPANY_INFO.branch}</p>
                <p>PhonePe / other UPI apps: {COMPANY_INFO.upiPhone}</p>
                <p>PAN: {COMPANY_INFO.pan}</p>
                {invoice.balance_payable > 0 && (
                  <p className="mt-1 font-semibold text-primary print:text-black">
                    Pay {inr(invoice.balance_payable)} and share the UTR / screenshot with us.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1 text-sm">
            <Row label="Per Day Subtotal (all items · 1 day)" value={inr(perDaySubtotal)} />
            <Row label="Rental Duration" value={`${billedDays} day(s)`} />
            {billedDays > 1 ? (
              <Row
                label={`Rental Subtotal (${inr(perDaySubtotal)}/day × ${billedDays} days)`}
                value={inr(invoice.subtotal)}
              />
            ) : (
              <Row label="Rental Subtotal (1 day)" value={inr(invoice.subtotal)} />
            )}
            {invoice.discount > 0 && <Row label="Discount" value={`− ${inr(invoice.discount)}`} />}
            {invoice.transport_charges > 0 && (
              <Row label="Transport / Packaging" value={inr(invoice.transport_charges)} />
            )}
            <Row label="Security Deposit" value={inr(invoice.security_deposit)} />
            <Row label="Advance Adjusted" value={`− ${inr(invoice.advance_received)}`} />
            <div className="mt-1.5 flex items-center justify-between rounded-lg border border-primary/45 bg-primary/10 px-3 py-2 print:border-black print:bg-transparent">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary print:text-black">
                {isQuote ? "Estimated Balance" : "Net Balance Due"}
              </span>
              <span className="font-display text-xl tracking-wide text-primary print:text-black">
                {inr(invoice.balance_payable)}
              </span>
            </div>
            {issued !== null && (
              <>
                <Row label="Client-Issued Amount (Agreed)" value={inr(issued)} />
                {invoice.balance_payable - issued > 0 && (
                  <Row
                    label="Concession Allowed"
                    value={`− ${inr(invoice.balance_payable - issued)}`}
                  />
                )}
              </>
            )}
            <p className="text-[11px] italic text-muted-foreground print:text-black">
              {amountInWords(issued ?? invoice.balance_payable)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground print:text-black">
              Non-GST rental document
            </p>
          </div>
        </section>

        {notes && (
          <p className="text-xs text-muted-foreground print:text-black">
            <span className="font-semibold text-foreground print:text-black">Notes: </span>
            {notes}
          </p>
        )}

        <section className="flex items-end justify-between gap-8 pt-5 text-center text-[11px] text-muted-foreground print:text-black">
          <div className="w-52 border-t border-dashed border-primary/50 pt-1.5 print:border-black">
            Client Signature &amp; Acknowledgement
          </div>
          <div className="w-52 border-t border-dashed border-primary/50 pt-1.5 print:border-black">
            Authorised Signatory · For {COMPANY_INFO.name}
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
      <span className="font-medium">{value}</span>
    </div>
  );
}
