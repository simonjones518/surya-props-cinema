import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import { inr, shootDays } from "@/lib/format";
import type { Prop } from "@/lib/types";

export function RentModal({
  prop,
  open,
  onOpenChange,
}: {
  prop: Prop | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [productionHouse, setProductionHouse] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [start, setStart] = useState("");
  const [wrap, setWrap] = useState("");
  const [advancePercent, setAdvancePercent] = useState(40);

  const days = shootDays(start, wrap);
  const quote = useMemo(() => {
    if (!prop) return null;
    const weeks = Math.floor(days / 7);
    const extraDays = days % 7;
    const rent = weeks * prop.weekly_rate + extraDays * prop.daily_rate;
    const gst = Math.round(rent * 0.18);
    const total = rent + gst;
    const advance = Math.round(total * (advancePercent / 100));
    return {
      weeks,
      extraDays,
      rent,
      gst,
      total,
      deposit: prop.security_deposit,
      advance,
      balance: total - advance,
      payNow: advance + prop.security_deposit,
    };
  }, [prop, days, advancePercent]);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      if (!prop || !quote) throw new Error("Incomplete booking");
      return api.createBooking({
        prop_id: prop.id,
        production_house: productionHouse,
        contact_person: contactPerson,
        phone,
        start_date: start,
        wrap_date: wrap,
        advance_percent: advancePercent,
        total_rent: quote.total,
        security_deposit: quote.deposit,
        advance_paid: quote.advance,
        balance_due: quote.balance,
      });
    },
    onSuccess: (res) => {
      toast.success(`Booking ${res.booking_code} reserved`, {
        description: `${prop?.title} · ${days} shoot day(s). Our production desk will confirm within 2 hours.`,
      });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Booking failed", { description: e.message }),
  });

  const valid = Boolean(prop && productionHouse && contactPerson && phone && days > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-primary/25 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide text-gradient-gold">
            Take on Rent
          </DialogTitle>
          <DialogDescription>
            {prop ? `${prop.title} · ${prop.serial_number}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Production House">
            <Input value={productionHouse} onChange={(e) => setProductionHouse(e.target.value)} placeholder="Vetri Cinemas" />
          </Field>
          <Field label="Contact Person">
            <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Line producer" />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98400 00000" />
          </Field>
          <Field label="Advance Payment">
            <div className="pt-3">
              <Slider
                value={[advancePercent]}
                min={10}
                max={100}
                step={5}
                onValueChange={([v]) => setAdvancePercent(v ?? 40)}
                aria-label="Advance payment percentage"
              />
              <p className="mt-2 text-xs font-semibold text-primary">{advancePercent}% upfront</p>
            </div>
          </Field>
          <Field label="Shoot Start">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Wrap Date">
            <Input type="date" value={wrap} min={start || undefined} onChange={(e) => setWrap(e.target.value)} />
          </Field>
        </div>

        <div className="rounded-lg border border-primary/25 surface-metal p-4">
          <p className="font-display text-lg tracking-wider text-primary">Instant Quotation</p>
          {prop && quote && days > 0 ? (
            <dl className="mt-3 space-y-2 text-sm">
              <Row label={`Shoot duration`} value={`${days} day(s) — ${quote.weeks}w ${quote.extraDays}d`} />
              <Row label="Rental charges" value={inr(quote.rent)} />
              <Row label="GST @ 18%" value={inr(quote.gst)} />
              <Row label="Refundable security deposit" value={inr(quote.deposit)} />
              <div className="h-px bg-border" />
              <Row label={`Advance payable now (${advancePercent}%)`} value={inr(quote.advance)} strong />
              <Row label="Balance on wrap" value={inr(quote.balance)} />
              <Row label="Pay now (advance + deposit)" value={inr(quote.payNow)} strong />
            </dl>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Pick a shoot start and wrap date to generate the quotation breakdown.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || isPending} onClick={() => mutate()}>
            {isPending ? "Reserving…" : "Confirm Reservation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-bold text-primary" : "font-medium text-foreground"}>{value}</dd>
    </div>
  );
}