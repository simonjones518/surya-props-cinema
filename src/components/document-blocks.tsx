import { COMPANY_INFO } from "@/lib/company";
import upiQrAsset from "@/assets/upi-qr.jpeg.asset.json";
import signatureAsset from "@/assets/signature.png.asset.json";

/**
 * Shared printable building blocks so every invoice, quotation, receipt and
 * challan uses one identical layout: totals card → bank + UPI cards →
 * terms card → signature strip with the authorised signature image.
 */

export function SummaryCard({
  rows,
  grand,
  deductions = [],
  netLabel,
  netValue,
  words,
  postRows = [],
}: {
  rows: { label: string; value: string }[];
  grand?: { label: string; value: string };
  deductions?: { label: string; value: string }[];
  postRows?: { label: string; value: string }[];
  netLabel: string;
  netValue: string;
  words?: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-primary/35 print:border-black">
      <div className="divide-y divide-primary/20 print:divide-black/30">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 px-4 py-1.5 text-sm">
            <span className="text-muted-foreground print:text-black">{r.label}</span>
            <span className="font-semibold">{r.value}</span>
          </div>
        ))}
        {grand && (
          <div className="flex items-center justify-between gap-4 px-4 py-2">
            <span className="text-base font-bold uppercase tracking-wide text-foreground print:text-black">
              {grand.label}
            </span>
            <span className="font-display text-xl tracking-wide text-foreground print:text-black">
              {grand.value}
            </span>
          </div>
        )}
        {deductions.map((d) => (
          <div key={d.label} className="flex items-center justify-between gap-4 px-4 py-1.5 text-sm">
            <span className="text-muted-foreground print:text-black">{d.label}</span>
            <span className="font-semibold">{d.value}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 bg-primary px-4 py-2.5 text-primary-foreground print:bg-black print:text-white">
        <span className="text-xs font-bold uppercase tracking-[0.2em]">{netLabel}</span>
        <span className="font-display text-xl tracking-wide">{netValue}</span>
      </div>
      {postRows.length > 0 && (
        <div className="divide-y divide-primary/20 print:divide-black/30">
          {postRows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between gap-4 px-4 py-1.5 text-sm"
            >
              <span className="text-muted-foreground print:text-black">{r.label}</span>
              <span className="font-semibold">{r.value}</span>
            </div>
          ))}
        </div>
      )}
      {words && (
        <p className="px-4 py-1.5 text-[11px] italic text-muted-foreground print:text-black">
          {words} · Non-GST rental document
        </p>
      )}
    </section>
  );
}

export function PaymentCards({
  showQr = true,
  payLine,
}: {
  showQr?: boolean;
  payLine?: string;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-primary/35 p-3 print:border-black">
        <p className="border-b border-primary/25 pb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary print:border-black print:text-black">
          Bank Details
        </p>
        <dl className="mt-2 space-y-0.5 text-[11px] text-muted-foreground print:text-black">
          <BankRow label="Bank Name" value="AXIS BANK" />
          <BankRow label="Account Name" value={COMPANY_INFO.accountName} />
          <BankRow label="Account No" value={COMPANY_INFO.accountNumber} />
          <BankRow label="IFSC Code" value={COMPANY_INFO.ifsc} />
          <BankRow label="Branch" value="JUBILEEHILLS" />
          <BankRow label="PAN No" value={COMPANY_INFO.pan} />
        </dl>
      </div>
      <div className="rounded-xl border border-primary/35 p-3 print:border-black">
        <p className="border-b border-primary/25 pb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary print:border-black print:text-black">
          UPI &amp; Quick Payment
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="text-[11px] leading-relaxed text-muted-foreground print:text-black">
            <p className="font-mono">
              <span className="font-bold text-foreground print:text-black">UPI ID: </span>
              {COMPANY_INFO.upiId}
            </p>
            <p>
              <span className="font-bold text-foreground print:text-black">GPay / PhonePe: </span>
              {COMPANY_INFO.upiPhone}
            </p>
            {payLine && (
              <p className="mt-1 font-semibold text-primary print:text-black">{payLine}</p>
            )}
          </div>
          {showQr && (
            <img
              src={upiQrAsset.url}
              alt="UPI payment QR code"
              className="size-24 shrink-0 rounded-md border border-primary/40 bg-white p-1 print:border-black"
            />
          )}
        </div>
      </div>
    </section>
  );
}

function BankRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground print:text-black">
        {label}:
      </dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

export function TermsCard({ text }: { text?: string }) {
  return (
    <section className="rounded-xl border border-primary/35 p-3 print:border-black">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary print:text-black">
        Terms &amp; Conditions
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground print:text-black">
        {text ??
          `The production team assumes full financial responsibility for any repair, loss, or total destruction of rented props during the tenure, based on the full replacement or market restoration value determined by ${COMPANY_INFO.name}.`}
      </p>
    </section>
  );
}

export function SignatureStrip({ clientLabel = "Client Signature" }: { clientLabel?: string }) {
  return (
    <section className="grid gap-8 pt-4 sm:grid-cols-2">
      <div className="text-center">
        <div className="h-14" />
        <div className="border-t border-dashed border-primary/50 pt-1.5 print:border-black">
          <p className="text-[11px] font-bold text-foreground print:text-black">{clientLabel}</p>
          <p className="text-[10px] text-muted-foreground print:text-black">
            Authorized Production Representative
          </p>
        </div>
      </div>
      <div className="text-center">
        <img
          src={signatureAsset.url}
          alt="Authorised signature"
          className="mx-auto h-14 object-contain"
        />
        <div className="border-t border-dashed border-primary/50 pt-1.5 print:border-black">
          <p className="text-[11px] font-bold uppercase text-foreground print:text-black">
            For {COMPANY_INFO.name}
          </p>
          <p className="text-[10px] text-muted-foreground print:text-black">
            Authorized Signature
          </p>
        </div>
      </div>
    </section>
  );
}
