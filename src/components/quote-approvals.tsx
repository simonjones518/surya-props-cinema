import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BadgeCheck,
  FileText,
  HardHat,
  IndianRupee,
  PackageCheck,
  Plus,
  Printer,
  Send,
  Trash2,
  Truck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DOC_LABEL, QuoteDocument, type QuoteDocKind } from "@/components/quote-document";
import { QuoteTimeline } from "@/components/quote-timeline";
import { inr } from "@/lib/format";
import { portal, portalKeys, QUOTE_LABEL, QUOTE_TONE } from "@/lib/portal-api";
import { staffApi, staffKeys } from "@/lib/staff-api";
import { openWhatsAppTo, quotationReadyMessage } from "@/lib/whatsapp";
import type { LabourDay, QuoteRequest } from "@/lib/types";

/** Admin: review client quote requests, price them, verify advances, record returns. */
export function QuoteApprovals() {
  const quotes = useQuery({
    queryKey: portalKeys.allQuotes,
    queryFn: portal.getAllQuotes,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
  const [priceFor, setPriceFor] = useState<QuoteRequest | null>(null);
  const [returnFor, setReturnFor] = useState<QuoteRequest | null>(null);
  const [dispatchFor, setDispatchFor] = useState<QuoteRequest | null>(null);
  const [advanceFor, setAdvanceFor] = useState<QuoteRequest | null>(null);
  const [labourFor, setLabourFor] = useState<QuoteRequest | null>(null);
  const [closeFor, setCloseFor] = useState<QuoteRequest | null>(null);
  const [doc, setDoc] = useState<{ quote: QuoteRequest; kind: QuoteDocKind } | null>(null);
  const qc = useQueryClient();


  const verify = useMutation({
    mutationFn: (id: number) => portal.verifyAdvance({ id }),
    onSuccess: () => {
      toast.success("Advance verified — money receipt generated");
      void qc.invalidateQueries({ queryKey: portalKeys.allQuotes });
      void qc.invalidateQueries({ queryKey: ["props"] });
    },
    onError: (e: Error) => toast.error("Could not verify", { description: e.message }),
  });

  const dispatchProps = useMutation({
    mutationFn: (payload: {
      id: number;
      vehicle?: string;
      notes?: string;
      crew_ids?: number[];
      crew_wages?: { staff_id: number; daily_wage: number }[];

    }) => portal.dispatchQuote(payload),
    onSuccess: () => {
      toast.success("Props dispatched — rental is now live on-set");
      void qc.invalidateQueries({ queryKey: portalKeys.allQuotes });
      void qc.invalidateQueries({ queryKey: ["props"] });
    },
    onError: (e: Error) => toast.error("Could not dispatch", { description: e.message }),
  });

  const reviseAdvance = useMutation({
    mutationFn: (payload: { id: number; advance_required: number }) =>
      portal.setAdvanceRequired(payload.id, payload.advance_required),
    onSuccess: (_r, vars) => {
      toast.success(
        vars.advance_required > 0
          ? `Advance revised to ${inr(vars.advance_required)}`
          : "Advance waived — no advance payment required",
      );
      void qc.invalidateQueries({ queryKey: portalKeys.allQuotes });
      setAdvanceFor(null);
    },
    onError: (e: Error) => toast.error("Could not revise the advance", { description: e.message }),
  });

  const closeOrder = useMutation({
    mutationFn: (payload: { id: number; amount: number }) =>
      portal.closeSettlement(payload.id, payload.amount),
    onSuccess: (_r, vars) => {
      toast.success(`Order closed on the client-issued amount ${inr(vars.amount)}`);
      void qc.invalidateQueries({ queryKey: portalKeys.allQuotes });
      setCloseFor(null);
    },
    onError: (e: Error) => toast.error("Could not close order", { description: e.message }),
  });

  const saveLabour = useMutation({
    mutationFn: (payload: { id: number; days: LabourDay[] }) =>
      portal.saveLabourSheet(payload.id, payload.days),
    onSuccess: () => {
      toast.success("Labour charge sheet saved");
      void qc.invalidateQueries({ queryKey: portalKeys.allQuotes });
    },
    onError: (e: Error) => toast.error("Could not save labour sheet", { description: e.message }),
  });

  const closeLabour = useMutation({
    mutationFn: (payload: { id: number; amount: number }) =>
      portal.closeLabourInvoice(payload.id, payload.amount),
    onSuccess: (_r, vars) => {
      toast.success(`Labour invoice closed at ${inr(vars.amount)}`);
      void qc.invalidateQueries({ queryKey: portalKeys.allQuotes });
      setLabourFor(null);
    },
    onError: (e: Error) => toast.error("Could not close labour invoice", { description: e.message }),
  });


  if (quotes.isLoading) return <Skeleton className="mt-6 h-40 rounded-xl" />;
  const list = quotes.data ?? [];

  return (
    <section className="mt-6 space-y-4 print:hidden" aria-label="Client quote requests">
      {list.length === 0 ? (
        <div className="rounded-xl border border-primary/20 bg-card p-10 text-center text-sm text-muted-foreground">
          No client quote requests yet.
        </div>
      ) : (
        list.map((quote) => (
          <article key={quote.id} className="rounded-xl border border-primary/20 bg-card p-4 sm:p-5">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl tracking-wide">{quote.quote_code}</p>
                <p className="text-sm font-semibold text-primary">
                  {quote.movie_name || "Untitled project"}
                  {quote.production_house && (
                    <span className="text-muted-foreground"> · {quote.production_house}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Attn {quote.contact_person}
                  {quote.client_designation ? ` (${quote.client_designation})` : ""} · {quote.phone}
                </p>
                <p className="text-xs text-muted-foreground">
                  {quote.shoot_location || "Location TBC"} · {quote.shoot_start_date} →{" "}
                  {quote.actual_return_date ?? quote.estimated_return_date} ·{" "}
                  {quote.actual_days_used ?? quote.estimated_days} day(s)
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${QUOTE_TONE[quote.status]}`}
              >
                {QUOTE_LABEL[quote.status]}
              </span>
            </header>

            <QuoteTimeline quote={quote} side="admin" />

            <ul className="mt-4 divide-y divide-border/60 text-sm">
              {quote.items.map((item) => (
                <li key={item.prop_id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    <span className="font-semibold">{item.prop_name}</span>
                    {item.prop_specs && (
                      <span className="text-muted-foreground"> ({item.prop_specs})</span>
                    )}
                    <span className="block font-mono text-[10px] text-muted-foreground">
                      {item.serial_number} ·{" "}
                      {[item.godown_name, item.rack_name].filter(Boolean).join(" · ") || "Unassigned"}
                    </span>
                  </span>
                  <span className="text-right text-xs text-muted-foreground">
                    × {item.quantity}
                    {item.daily_rate > 0 && (
                      <span className="ml-2 font-semibold text-primary">
                        {inr(item.daily_rate)}/day
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            {quote.client_notes && (
              <p className="mt-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Client notes: </span>
                {quote.client_notes}
              </p>
            )}

            {quote.status !== "quote_requested" && (
              <div className="mt-4 grid gap-3 rounded-lg border border-border bg-secondary/40 p-3 text-sm sm:grid-cols-4">
                <Stat
                  label={quote.status === "settled" ? "Final Total" : "Estimated Total"}
                  value={inr(quote.status === "settled" ? quote.final_total : quote.estimated_total)}
                />
                <Stat label="Deposit" value={inr(quote.security_deposit)} />
                <Stat
                  label={quote.advance_paid > 0 ? "Advance Paid" : "Advance Required"}
                  value={inr(quote.advance_paid > 0 ? quote.advance_paid : quote.advance_required)}
                />
                <Stat label="Balance Due" value={inr(quote.balance_due)} highlight />
              </div>
            )}

            {quote.payment_reference && (
              <p className="mt-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Payment ref: </span>
                {quote.payment_reference}
                {quote.payment_proof_url && (
                  <a
                    href={quote.payment_proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-primary underline"
                  >
                    View proof
                  </a>
                )}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {(quote.status === "quote_requested" || quote.status === "quote_sent") && (
                <Button size="sm" onClick={() => setPriceFor(quote)}>
                  <IndianRupee className="size-4" />
                  {quote.status === "quote_sent" ? "Revise Pricing" : "Set Rates & Approve"}
                </Button>
              )}
              {["quote_sent", "quote_accepted", "advance_submitted"].includes(quote.status) && (
                <Button size="sm" variant="outline" onClick={() => setAdvanceFor(quote)}>
                  <IndianRupee className="size-4" /> Revise Advance
                </Button>
              )}
              {quote.advance_required <= 0 &&
                ["quote_sent", "quote_accepted"].includes(quote.status) && (
                  <Button size="sm" onClick={() => setDispatchFor(quote)}>
                    <Send className="size-4" /> Dispatch (No Advance)
                  </Button>
                )}
              {quote.status === "advance_submitted" && (
                <Button size="sm" onClick={() => verify.mutate(quote.id)} disabled={verify.isPending}>
                  <BadgeCheck className="size-4" /> Confirm Payment Received
                </Button>
              )}
              {quote.status === "payment_received" && (
                <Button size="sm" onClick={() => setDispatchFor(quote)}>
                  <Send className="size-4" /> Dispatch Props
                </Button>
              )}
              {(quote.status === "dispatched" || quote.status === "on_set") && (
                <Button size="sm" onClick={() => setReturnFor(quote)}>
                  <PackageCheck className="size-4" /> Record Return
                </Button>
              )}
              {quote.status === "settled" && (
                <Button size="sm" onClick={() => setCloseFor(quote)}>
                  <BadgeCheck className="size-4" /> Close on Client-Issued Amount
                </Button>
              )}
              {["dispatched", "on_set", "settled", "closed"].includes(quote.status) && (
                <Button size="sm" variant="outline" onClick={() => setLabourFor(quote)}>
                  <HardHat className="size-4" /> Labour Sheet
                </Button>
              )}
              {quote.labour_total > 0 && (
                <DocButton quote={quote} kind="labour" onOpen={setDoc} icon={Users} />
              )}
              {quote.status !== "quote_requested" && (
                <>
                  <DocButton quote={quote} kind="quotation" onOpen={setDoc} icon={FileText} />
                  <DocButton quote={quote} kind="advance-request" onOpen={setDoc} icon={IndianRupee} />
                </>
              )}
              {["payment_received", "dispatched", "on_set", "settled", "closed"].includes(
                quote.status,
              ) && <DocButton quote={quote} kind="receipt" onOpen={setDoc} icon={BadgeCheck} />}
              {["dispatched", "on_set", "settled", "closed"].includes(quote.status) && (
                <DocButton quote={quote} kind="challan" onOpen={setDoc} icon={Truck} />
              )}
              {(quote.status === "settled" || quote.status === "closed") && (
                <DocButton quote={quote} kind="settlement" onOpen={setDoc} icon={Printer} />
              )}
            </div>
          </article>
        ))
      )}

      <AdvanceDialog
        quote={advanceFor}
        onOpenChange={(v) => !v && setAdvanceFor(null)}
        onSubmit={(payload) => reviseAdvance.mutate(payload)}
        pending={reviseAdvance.isPending}
      />
      <LabourDialog
        quote={labourFor}
        onOpenChange={(v) => !v && setLabourFor(null)}
        onSave={(days) => labourFor && saveLabour.mutate({ id: labourFor.id, days })}
        onClose={(amount) => labourFor && closeLabour.mutate({ id: labourFor.id, amount })}
        pending={saveLabour.isPending || closeLabour.isPending}
      />
      <CloseSettlementDialog
        quote={closeFor}
        onOpenChange={(v) => !v && setCloseFor(null)}
        onSubmit={(amount) => closeFor && closeOrder.mutate({ id: closeFor.id, amount })}
        pending={closeOrder.isPending}
      />
      <PricingDialog quote={priceFor} onOpenChange={(v) => !v && setPriceFor(null)} />
      <ReturnDialog quote={returnFor} onOpenChange={(v) => !v && setReturnFor(null)} />
      <DispatchDialog
        quote={dispatchFor}
        onOpenChange={(v) => !v && setDispatchFor(null)}
        onSubmit={(payload) => {
          dispatchProps.mutate(payload);
          setDispatchFor(null);
        }}
        pending={dispatchProps.isPending}
      />


      <Dialog open={doc !== null} onOpenChange={(v) => !v && setDoc(null)}>
        <DialogContent className="max-h-[94vh] max-w-3xl overflow-y-auto border-primary/25 bg-card">
          <DialogHeader className="print:hidden">
            <DialogTitle className="font-display text-2xl tracking-wide text-gradient-gold">
              Rental Document
            </DialogTitle>
            <DialogDescription>One-click print or PDF export.</DialogDescription>
          </DialogHeader>
          {doc && <QuoteDocument quote={doc.quote} kind={doc.kind} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function DocButton({
  quote,
  kind,
  onOpen,
  icon: Icon,
}: {
  quote: QuoteRequest;
  kind: QuoteDocKind;
  onOpen: (v: { quote: QuoteRequest; kind: QuoteDocKind }) => void;
  icon: typeof FileText;
}) {
  return (
    <Button size="sm" variant="outline" onClick={() => onOpen({ quote, kind })}>
      <Icon className="size-4" /> {DOC_LABEL[kind]}
    </Button>
  );
}

function AdvanceDialog({
  quote,
  onOpenChange,
  onSubmit,
  pending,
}: {
  quote: QuoteRequest | null;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: { id: number; advance_required: number }) => void;
  pending: boolean;
}) {
  const [amount, setAmount] = useState(0);
  useEffect(() => setAmount(quote?.advance_required ?? 0), [quote?.id, quote?.advance_required]);

  return (
    <Dialog open={quote !== null} onOpenChange={onOpenChange}>
      <DialogContent className="border-primary/25 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">Advance Payment</DialogTitle>
          <DialogDescription>
            Raise, reduce or waive the advance for this shoot. Set ₹0 to dispatch with no advance.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="adv-amount">Advance Required ₹ (0 = no advance)</Label>
            <Input
              id="adv-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            />
          </div>
          {quote && (
            <p className="text-xs text-muted-foreground">
              Estimated total {inr(quote.estimated_total)} + deposit {inr(quote.security_deposit)} →
              balance after advance{" "}
              <span className="font-semibold text-primary">
                {inr(Math.max(0, quote.estimated_total + quote.security_deposit - amount))}
              </span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAmount(0)}
              disabled={pending}
            >
              Waive advance
            </Button>
            {quote && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => setAmount(Math.round(quote.estimated_total * 0.5))}
                >
                  50% of rent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => setAmount(Math.round(quote.estimated_total))}
                >
                  Full rent
                </Button>
              </>
            )}
          </div>
          <Button
            className="w-full"
            disabled={pending || !quote}
            onClick={() => quote && onSubmit({ id: quote.id, advance_required: amount })}
          >
            {pending ? "Saving…" : "Save Advance Amount"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DispatchDialog({
  quote,
  onOpenChange,
  onSubmit,
  pending,
}: {
  quote: QuoteRequest | null;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: {
    id: number;
    vehicle?: string;
    notes?: string;
    crew_ids?: number[];
    crew_wages?: { staff_id: number; daily_wage: number }[];
  }) => void;
  pending: boolean;
}) {
  const [vehicle, setVehicle] = useState("");
  const [notes, setNotes] = useState("");
  /** Selected worker id -> wage agreed for this project (entered here, not fixed). */
  const [crewWages, setCrewWages] = useState<Record<number, number>>({});
  const staff = useQuery({
    queryKey: staffKeys.staff,
    queryFn: staffApi.listStaff,
    enabled: quote !== null,
  });
  const crew = (staff.data ?? []).filter((s) => s.active && s.staff_role === "field");
  const selected = crew.filter((c) => crewWages[c.id] !== undefined);
  const wageTotal = selected.reduce((s, c) => s + (crewWages[c.id] || 0), 0);

  useEffect(() => {
    setVehicle("");
    setNotes("");
    setCrewWages({});
  }, [quote?.id]);


  return (
    <Dialog open={quote !== null} onOpenChange={onOpenChange}>
      <DialogContent className="border-primary/25 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">Dispatch Props</DialogTitle>
          <DialogDescription>
            The rental clock starts today. A delivery challan is generated on dispatch.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="dispatch-vehicle">Vehicle / Transport</Label>
            <Input
              id="dispatch-vehicle"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              placeholder="TN 09 AB 1234 — Tempo"
            />
          </div>
          <div className="space-y-2">
            <Label>Field operations crew deployed</Label>
            {crew.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No active field-operations staff yet — add them under Staff &amp; Roles.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {crew.map((c) => {
                  const on = crewWages[c.id] !== undefined;
                  return (
                    <Button
                      key={c.id}
                      type="button"
                      size="sm"
                      variant={on ? "default" : "outline"}
                      onClick={() =>
                        setCrewWages((prev) => {
                          const next = { ...prev };
                          if (on) delete next[c.id];
                          else next[c.id] = 0;
                          return next;
                        })
                      }
                    >
                      <HardHat className="size-4" /> {c.full_name}
                    </Button>
                  );
                })}
              </div>
            )}

            {selected.length > 0 && (
              <div className="space-y-2 rounded-lg border border-primary/20 bg-secondary/30 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Wage for this project (per worker, per day)
                </p>
                {selected.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3">
                    <span className="text-xs">
                      {c.full_name}
                      <span className="block font-mono text-[10px] text-muted-foreground">
                        {c.staff_code}
                      </span>
                    </span>
                    <Input
                      className="w-32"
                      type="number"
                      min={0}
                      placeholder="₹ wage / day"
                      aria-label={`Wage for ${c.full_name}`}
                      value={crewWages[c.id] || ""}
                      onChange={(e) =>
                        setCrewWages((prev) => ({
                          ...prev,
                          [c.id]: Math.max(0, Number(e.target.value)),
                        }))
                      }
                    />
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">
                  {selected.length} worker(s) · {inr(wageTotal)} per day — billed on a separate
                  labour invoice.
                </p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dispatch-notes">Dispatch notes</Label>
            <Textarea
              id="dispatch-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Handled by, packing condition, accessories included…"
            />
          </div>
          <Button
            className="w-full"
            disabled={pending || !quote}
            onClick={() =>
              quote &&
              onSubmit({
                id: quote.id,
                vehicle,
                notes,
                crew_ids: selected.map((c) => c.id),
                crew_wages: selected.map((c) => ({
                  staff_id: c.id,
                  daily_wage: crewWages[c.id] || 0,
                })),
              })
            }
          >

            <Send className="size-4" /> Confirm Dispatch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


/**
 * Day-wise crew labour charge sheet. Rates can differ per day (₹1,000 one day,
 * ₹1,800 the next). Billed on a separate labour invoice, never mixed with the
 * prop rental invoice. The client's manager then fixes what they will pay.
 */
function LabourDialog({
  quote,
  onOpenChange,
  onSave,
  onClose,
  pending,
}: {
  quote: QuoteRequest | null;
  onOpenChange: (v: boolean) => void;
  onSave: (days: LabourDay[]) => void;
  onClose: (amount: number) => void;
  pending: boolean;
}) {
  const [days, setDays] = useState<LabourDay[]>([]);
  const [issued, setIssued] = useState(0);

  const total = days.reduce((s, d) => s + d.workers * d.rate, 0);

  useEffect(() => {
    if (!quote) return;
    setDays(
      quote.labour_days.length > 0
        ? quote.labour_days
        : [
            {
              date: (quote.dispatch_at ?? new Date().toISOString()).slice(0, 10),
              workers: Math.max(1, quote.crew_assignments.length || 1),
              rate:
                quote.crew_assignments.length > 0
                  ? quote.crew_assignments.reduce((sum, worker) => sum + worker.daily_wage, 0) /
                    quote.crew_assignments.length
                  : 0,
              amount: 0,
              note: "",
            },
          ],
    );
    setIssued(quote.labour_settled_amount || quote.labour_total || 0);
  }, [quote?.id]);

  function patch(idx: number, next: Partial<LabourDay>) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== idx) return d;
        const merged = { ...d, ...next };
        return { ...merged, amount: merged.workers * merged.rate };
      }),
    );
  }

  return (
    <Dialog open={quote !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-primary/25 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            Crew Daily Labour Sheet
          </DialogTitle>
          <DialogDescription>
            Day one to closing day. Charges are raised on a separate labour invoice — not on the prop
            rental invoice.
          </DialogDescription>
        </DialogHeader>

        {quote && quote.crew_assignments.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Deployed crew: {quote.crew_assignments.map((c) => c.staff_name).join(", ")}
          </p>
        )}

        <div className="space-y-2">
          {days.map((d, idx) => (
            <div key={idx} className="grid gap-2 border-t border-border/60 pt-2 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  type="date"
                  value={d.date}
                  onChange={(e) => patch(idx, { date: e.target.value })}
                />
                <Input
                  placeholder="Note (loading, night shift…)"
                  value={d.note}
                  onChange={(e) => patch(idx, { note: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  className="w-20"
                  type="number"
                  min={1}
                  aria-label="Workers"
                  value={d.workers}
                  onChange={(e) => patch(idx, { workers: Math.max(1, Number(e.target.value)) })}
                />
                <Input
                  className="w-28"
                  type="number"
                  min={0}
                  aria-label="Charge per worker"
                  value={d.rate}
                  onChange={(e) => patch(idx, { rate: Math.max(0, Number(e.target.value)) })}
                />
                <span className="w-24 text-right font-display text-lg tracking-wide text-primary">
                  {inr(d.workers * d.rate)}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove day"
                  disabled={days.length === 1}
                  onClick={() => setDays(days.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setDays([
                ...days,
                {
                  date: new Date().toISOString().slice(0, 10),
                  workers: days[days.length - 1]?.workers ?? 1,
                  rate: days[days.length - 1]?.rate ?? 0,
                  amount: 0,
                  note: "",
                },
              ])
            }
          >
            <Plus className="size-4" /> Add day
          </Button>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Labour Total</p>
          <p className="font-display text-2xl tracking-wide text-primary">{inr(total)}</p>
        </div>

        <Button className="w-full" disabled={pending} onClick={() => onSave(days)}>
          <HardHat className="size-4" /> Save Labour Sheet
        </Button>

        <div className="space-y-1.5 rounded-xl border border-primary/20 p-3">
          <Label htmlFor="labour-issued">Client-issued labour amount ₹</Label>
          <Input
            id="labour-issued"
            type="number"
            min={0}
            value={issued}
            onChange={(e) => setIssued(Math.max(0, Number(e.target.value)))}
          />
          <p className="text-[11px] text-muted-foreground">
            Whatever the production finally agrees to pay for manpower. The difference is recorded as
            a concession on the labour invoice.
          </p>
          <Button
            variant="outline"
            className="w-full"
            disabled={pending || quote?.labour_status === "closed"}
            onClick={() => onClose(issued)}
          >
            <BadgeCheck className="size-4" />{" "}
            {quote?.labour_status === "closed" ? "Labour Invoice Closed" : "Close Labour Invoice"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Closing the props settlement on the amount the client's manager issued —
 * e.g. a ₹5,500 settlement invoice closed at ₹5,000, with ₹500 conceded.
 */
function CloseSettlementDialog({
  quote,
  onOpenChange,
  onSubmit,
  pending,
}: {
  quote: QuoteRequest | null;
  onOpenChange: (v: boolean) => void;
  onSubmit: (amount: number) => void;
  pending: boolean;
}) {
  const [amount, setAmount] = useState(0);
  useEffect(() => {
    setAmount(quote?.balance_due ?? 0);
  }, [quote?.id]);
  const invoiced = quote?.balance_due ?? 0;
  const waived = Math.max(0, invoiced - amount);

  return (
    <Dialog open={quote !== null} onOpenChange={onOpenChange}>
      <DialogContent className="border-primary/25 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">Close Settlement</DialogTitle>
          <DialogDescription>
            Enter the amount the client actually issued against this settlement invoice.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Settlement invoice raised</span>
            <span className="font-display text-xl tracking-wide">{inr(invoiced)}</span>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="issued-amount">Client-issued amount ₹</Label>
            <Input
              id="issued-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Concession allowed</span>
            <span className="font-display text-xl tracking-wide text-primary">{inr(waived)}</span>
          </div>
          <Button className="w-full" disabled={pending || !quote} onClick={() => onSubmit(amount)}>
            <BadgeCheck className="size-4" /> Close Order at {inr(amount)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-display text-lg tracking-wide ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function PricingDialog({
  quote,
  onOpenChange,
}: {
  quote: QuoteRequest | null;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [rates, setRates] = useState<Record<number, { daily_rate: number; quantity: number }>>({});
  const [days, setDays] = useState(1);
  const [deposit, setDeposit] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!quote) return;
    setRates(
      Object.fromEntries(
        quote.items.map((i) => [i.prop_id, { daily_rate: i.daily_rate, quantity: i.quantity }]),
      ),
    );
    setDays(quote.estimated_days);
    setDeposit(quote.security_deposit);
    setAdvance(quote.advance_required);
    setNotes(quote.admin_notes ?? "");
  }, [quote]);

  const subtotal = quote
    ? quote.items.reduce((sum, i) => {
        const r = rates[i.prop_id];
        return sum + (r?.daily_rate ?? 0) * (r?.quantity ?? i.quantity) * days;
      }, 0)
    : 0;

  const approve = useMutation({
    mutationFn: () =>
      portal.priceQuote({
        id: quote!.id,
        estimated_days: days,
        security_deposit: deposit,
        advance_required: advance,
        admin_notes: notes,
        items: quote!.items.map((i) => ({
          prop_id: i.prop_id,
          daily_rate: rates[i.prop_id]?.daily_rate ?? 0,
          quantity: rates[i.prop_id]?.quantity ?? i.quantity,
        })),
      }),
    onSuccess: () => {
      toast.success("Quotation approved and sent to the client portal");
      if (quote) {
        openWhatsAppTo(
          quote.phone,
          quotationReadyMessage({
            quote_code: quote.quote_code,
            movie_name: quote.movie_name || "your project",
            contact_person: quote.contact_person,
            estimated_total: subtotal,
            advance_required: advance,
          }),
        );
      }
      void qc.invalidateQueries({ queryKey: portalKeys.allQuotes });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Could not approve", { description: e.message }),
  });

  return (
    <Dialog open={quote !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-primary/25 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide text-gradient-gold">
            Manual Pricing &amp; Approval
          </DialogTitle>
          <DialogDescription>
            Set a daily rate per item for this production, then send the quotation.
          </DialogDescription>
        </DialogHeader>

        {quote && (
          <div className="space-y-4">
            <ul className="divide-y divide-border rounded-xl border border-primary/20">
              {quote.items.map((item) => {
                const r = rates[item.prop_id];
                return (
                  <li key={item.prop_id} className="grid gap-3 p-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-semibold leading-tight">{item.prop_name}</p>
                      <p className="text-[11px] text-muted-foreground">{item.prop_specs || "—"}</p>
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="w-28 space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider">Rate/Day ₹</Label>
                        <Input
                          type="number"
                          min={0}
                          value={r?.daily_rate ?? 0}
                          onChange={(e) =>
                            setRates({
                              ...rates,
                              [item.prop_id]: {
                                daily_rate: Number(e.target.value),
                                quantity: r?.quantity ?? item.quantity,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="w-20 space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider">Qty</Label>
                        <Input
                          type="number"
                          min={1}
                          value={r?.quantity ?? item.quantity}
                          onChange={(e) =>
                            setRates({
                              ...rates,
                              [item.prop_id]: {
                                daily_rate: r?.daily_rate ?? 0,
                                quantity: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                      <div className="min-w-24 text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Line
                        </p>
                        <p className="font-display text-lg tracking-wide text-primary">
                          {inr((r?.daily_rate ?? 0) * (r?.quantity ?? item.quantity) * days)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="q-days">Estimated Days</Label>
                <Input
                  id="q-days"
                  type="number"
                  min={1}
                  value={days}
                  onChange={(e) => setDays(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="q-dep">Security Deposit ₹</Label>
                <Input
                  id="q-dep"
                  type="number"
                  min={0}
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="q-adv">Advance Required ₹ (0 = none)</Label>
                <Input
                  id="q-adv"
                  type="number"
                  min={0}
                  value={advance}
                  onChange={(e) => setAdvance(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="q-notes">Notes on the quotation</Label>
              <Textarea
                id="q-notes"
                rows={2}
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-primary/25 bg-secondary/40 p-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Estimated Total</span>
              <span className="font-display text-2xl tracking-wide text-primary">{inr(subtotal)}</span>
            </div>

            <Button className="w-full" disabled={subtotal <= 0 || approve.isPending} onClick={() => approve.mutate()}>
              {approve.isPending ? "Sending…" : "Approve & Send Quotation"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReturnDialog({
  quote,
  onOpenChange,
}: {
  quote: QuoteRequest | null;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const record = useMutation({
    mutationFn: () => portal.recordReturn(quote!.id, date),
    onSuccess: (res) => {
      toast.success("Return recorded & settlement generated", {
        description: `${res.actual_days_used} day(s) billed · balance ${inr(res.balance_due)}`,
      });
      void qc.invalidateQueries({ queryKey: portalKeys.allQuotes });
      void qc.invalidateQueries({ queryKey: ["props"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Could not record the return", { description: e.message }),
  });

  return (
    <Dialog open={quote !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-primary/25 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide text-gradient-gold">
            Record Return &amp; Settle
          </DialogTitle>
          <DialogDescription>
            The final amount is recalculated on actual days used, then the settlement invoice is
            issued to the client portal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="r-date">Actual Return Date</Label>
            <Input id="r-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button className="w-full" disabled={record.isPending} onClick={() => record.mutate()}>
            {record.isPending ? "Settling…" : "Recalculate & Issue Settlement"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
