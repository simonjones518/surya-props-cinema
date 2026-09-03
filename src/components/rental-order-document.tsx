import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { inr, prettyDate } from "@/lib/format";
import { amountInWords } from "@/lib/company";
import {
  PaymentCards,
  SignatureStrip,
  SummaryCard,
  TermsCard,
} from "@/components/document-blocks";
import type { RentalOrder } from "@/lib/types";

const BUSINESS = {
  name: "Surya Cine Special Props",
  address: "Annapurna Studio 7 Acres, Road Number 5, Jubilee Hills, Hyderabad, Telangana 500033",
  phone: "+91 98490 05451",
};

/** Non-GST cinema rental bill — estimated slip before shoot, final settlement after return. */
export function RentalOrderDocument({ order, onClose }: { order: RentalOrder; onClose: () => void }) {
  const settled = order.order_status === "Returned & Settled";
  const days = settled ? (order.actual_days_used ?? order.estimated_days) : order.estimated_days;
  const total = settled ? order.total_final_amount : order.estimated_total;
  const balance = total - order.advance_received;
  const perDaySubtotal = order.items.reduce(
    (sum, item) => sum + item.manual_daily_rate * item.quantity,
    0,
  );

  return (
    <div
      id="print-area"
      className="mx-auto max-w-3xl rounded-xl border border-primary/25 bg-white p-4 text-black shadow-cine print:border-0 print:p-2 print:shadow-none"
    >
      <div className="flex items-start justify-between gap-4 print:hidden">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-neutral-500">
          {settled ? "Props Rental Invoice" : "Estimated Rental Delivery Slip"}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> Print / Save PDF
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            <X className="size-4" /> Close
          </Button>
        </div>
      </div>

      <header className="mt-4 border-b-2 border-black pb-2">
        <BrandLogo className="h-12" />
        <p className="text-sm text-neutral-700">{BUSINESS.address}</p>
        <p className="text-sm text-neutral-700">Contact: {BUSINESS.phone}</p>
        <p className="mt-2 text-lg font-bold uppercase">
          {settled ? "Props Rental Invoice" : "Estimated Rental Delivery Challan"}
        </p>
      </header>

      <section className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <p className="font-bold uppercase text-neutral-500">Client</p>
          <p className="font-semibold">{order.production_house || order.client_name}</p>
          <p>{order.client_name}</p>
          <p>{order.phone_number}</p>
          {order.shoot_location && <p>Shoot location: {order.shoot_location}</p>}
        </div>
        <div className="sm:text-right">
          <p className="font-bold uppercase text-neutral-500">Document</p>
          <p className="font-mono">{order.order_number}</p>
          <p>Dispatch: {prettyDate(order.dispatch_date)}</p>
          <p>
            {settled
              ? `Returned: ${prettyDate(order.actual_return_date ?? "")}`
              : `Expected return: ${prettyDate(order.estimated_return_date)}`}
          </p>
          <p className="font-semibold">
            {settled ? "Actual days used" : "Estimated days"}: {days}
          </p>
        </div>
      </section>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-y-2 border-black text-left">
            <th className="py-2 pr-2">S.No</th>
            <th className="py-2 pr-2">Item Name &amp; Configuration</th>
            <th className="py-2 pr-2">Qty</th>
            <th className="py-2 pr-2">Days</th>
            <th className="py-2 pr-2">Rate / Day</th>
            <th className="py-2 text-right">Total / Day</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => {
            const itemDays = settled ? (item.actual_days_used ?? days) : item.estimated_days;
            return (
              <tr key={`${item.prop_id}-${index}`} className="border-b border-neutral-300 align-top">
                <td className="py-2 pr-2">{index + 1}</td>
                <td className="py-2 pr-2">
                  <p className="font-semibold">{item.prop_name}</p>
                  {item.prop_description && (
                    <p className="text-xs text-neutral-600">(Specs: {item.prop_description})</p>
                  )}
                  <p className="font-mono text-[11px] text-neutral-500">{item.serial_number}</p>
                </td>
                <td className="py-2 pr-2">{item.quantity}</td>
                <td className="py-2 pr-2">{itemDays}</td>
                <td className="py-2 pr-2">{inr(item.manual_daily_rate)}</td>
                <td className="py-2 text-right font-semibold">
                  {inr(item.manual_daily_rate * item.quantity)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-1.5 space-y-1.5">
        <SummaryCard
          rows={[
            { label: "Per Day Total:", value: inr(perDaySubtotal) },
            { label: "Total Days:", value: `${days} Days` },
          ]}
          grand={{
            label: `Grand Total (${inr(perDaySubtotal)} × ${days} Days)`,
            value: inr(total),
          }}
          deductions={[
            { label: "(+) Security Deposit (refundable):", value: inr(order.security_deposit) },
            { label: "(-) Advance Paid:", value: inr(order.advance_received) },
          ]}
          netLabel={balance >= 0 ? "Net Payable Amount" : "Refundable To Client"}
          netValue={inr(Math.abs(balance))}
          words={amountInWords(balance)}
        />
        <PaymentCards
          payLine={balance > 0 ? `Pay ${inr(balance)} and share the UTR / screenshot.` : undefined}
        />
        <TermsCard />
        <SignatureStrip />
      </div>

      {order.notes && <p className="mt-4 text-xs text-neutral-600">Notes: {order.notes}</p>}
      <p className="mt-6 text-center text-[11px] text-neutral-500">
        Non-GST rental bill · Props remain the property of {BUSINESS.name} until returned and inspected.
      </p>
    </div>
  );
}

