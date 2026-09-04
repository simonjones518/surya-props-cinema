import { COMPANY_INFO } from "@/lib/company";
import { DEFAULT_COMPANY_PROFILE, type CompanyProfile } from "@/lib/company-profiles";
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
    <section className="overflow-hidden rounded-lg border border-primary/35 print:border-black">
      <div>
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 px-2.5 py-px text-[13px] leading-tight">
            <span className="text-muted-foreground print:text-black">{r.label}</span>
            <span className="font-semibold">{r.value}</span>
          </div>
        ))}
        {grand && (
          <div className="flex items-center justify-between gap-3 px-2.5 py-0.5 leading-tight">
            <span className="text-[13px] font-bold uppercase tracking-wide text-foreground print:text-black">
              {grand.label}
            </span>
            <span className="font-display text-base tracking-wide text-foreground print:text-black">
              {grand.value}
            </span>
          </div>
        )}
        {deductions.map((d) => (
          <div key={d.label} className="flex items-center justify-between gap-3 px-2.5 py-px text-[13px] leading-tight">
            <span className="text-muted-foreground print:text-black">{d.label}</span>
            <span className="font-semibold">{d.value}</span>
          </div>
        ))}
      </div>
      <div
        className="net-payable-bar flex items-center justify-between gap-3 px-2.5 py-0.5"
        style={{
          backgroundColor: "#E10600",
          color: "#FFFFFF",
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{netLabel}</span>
        <span className="font-display text-base tracking-wide">{netValue}</span>
      </div>
      {postRows.length > 0 && (
        <div>
          {postRows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between gap-3 px-2.5 py-px text-[13px] leading-tight"
            >
              <span className="text-muted-foreground print:text-black">{r.label}</span>
              <span className="font-semibold">{r.value}</span>
            </div>
          ))}
        </div>
      )}
      {words && (
        <p className="px-2.5 py-px text-[10px] italic leading-tight text-muted-foreground print:text-black">
          {words} · Non-GST rental document
        </p>
      )}
    </section>
  );
}

export function PaymentCards({
  showQr = true,
  profile = DEFAULT_COMPANY_PROFILE,
}: {
  showQr?: boolean;
  /** Ignored — kept so existing callers keep compiling. */
  payLine?: string | undefined;
  profile?: CompanyProfile;
}) {
  return (
    <section className="grid gap-1.5 sm:grid-cols-2">
      <div className="rounded-lg border border-primary/35 p-2 print:border-black">
        <p className="border-b border-primary/25 pb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary print:border-black print:text-black">
          Bank Details
        </p>
        <dl className="mt-0.5 space-y-px text-[11px] leading-tight text-muted-foreground print:text-black">
          <BankRow label="Bank Name" value={profile.bank_name} />
          <BankRow label="Account Name" value={profile.account_name} />
          <BankRow label="Account No" value={profile.account_number} />
          <BankRow label="IFSC Code" value={profile.ifsc} />
          <BankRow label="Branch" value={profile.branch} />
          {profile.pan && <BankRow label="PAN No" value={profile.pan} />}
          {profile.gstin && <BankRow label="GSTIN" value={profile.gstin} />}
        </dl>
      </div>
      <div className="rounded-lg border border-primary/35 p-2 print:border-black">
        <p className="border-b border-primary/25 pb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary print:border-black print:text-black">
          UPI &amp; Quick Payment
        </p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <div className="text-[11px] leading-tight text-muted-foreground print:text-black">
            <p className="font-mono">
              <span className="font-bold text-foreground print:text-black">UPI ID: </span>
              {profile.upi_id}
            </p>
            <p>
              <span className="font-bold text-foreground print:text-black">GPay / PhonePe: </span>
              {profile.upi_phone}
            </p>
          </div>
          {showQr && profile.qr_url && (
            <img
              src={profile.qr_url}
              alt="UPI payment QR code"
              className="size-28 shrink-0 rounded-md border border-primary/40 bg-white p-1 print:border-black"
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

export function TermsCard({
  text,
  profile = DEFAULT_COMPANY_PROFILE,
}: {
  text?: string;
  profile?: CompanyProfile;
}) {
  return (
    <section className="rounded-lg border border-primary/35 p-2 print:border-black">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary print:text-black">
        Terms &amp; Conditions
      </p>
      <p className="mt-px text-[11px] leading-snug text-muted-foreground print:text-black">
        {text ??
          `The production team assumes full financial responsibility for any repair, loss, or total destruction of rented props during the tenure, based on the full replacement or market restoration value determined by ${profile.name || COMPANY_INFO.name}.`}
      </p>
    </section>
  );
}

export function SignatureStrip({
  clientLabel = "Client Signature",
  profile = DEFAULT_COMPANY_PROFILE,
}: {
  clientLabel?: string;
  profile?: CompanyProfile;
}) {
  return (
    <section className="grid gap-4 pt-1 sm:grid-cols-2">
      <div className="text-center">
        <div className="h-8" />
        <div className="border-t border-dashed border-primary/50 pt-1 print:border-black">
          <p className="text-[11px] font-bold text-foreground print:text-black">{clientLabel}</p>
          <p className="text-[10px] text-muted-foreground print:text-black">
            Authorized Production Representative
          </p>
        </div>
      </div>
      <div className="text-center">
        <img
          src={profile.signature_url || signatureAsset.url}
          alt="Authorised signature"
          className="mx-auto h-8 object-contain"
        />
        <div className="border-t border-dashed border-primary/50 pt-1 print:border-black">
          <p className="text-[11px] font-bold uppercase text-foreground print:text-black">
            For {profile.name || COMPANY_INFO.name}
          </p>
          <p className="text-[10px] text-muted-foreground print:text-black">
            Authorized Signature
          </p>
        </div>
      </div>
    </section>
  );
}

