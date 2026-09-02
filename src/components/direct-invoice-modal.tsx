import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarPlus, FileText, Plus, Send, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { QuoteDocument, type QuoteDocKind } from "@/components/quote-document";
import { api, queryKeys } from "@/lib/api";
import { inr } from "@/lib/format";
import { openWhatsAppTo } from "@/lib/whatsapp";
import type { Invoice, QuoteRequest } from "@/lib/types";

type ManualLine = {
  key: string;
  prop_name: string;
  prop_specs: string;
  serial_number: string;
  quantity: number;
  daily_rate: number;
};

const today = () => new Date().toISOString().slice(0, 10);
const newLine = (): ManualLine => ({
  key: Math.random().toString(36).slice(2, 9),
  prop_name: "",
  prop_specs: "",
  serial_number: "",
  quantity: 1,
  daily_rate: 0,
});

type ShootRow = { key: string; date: string; note: string };
const newShootRow = (date = today()): ShootRow => ({
  key: Math.random().toString(36).slice(2, 9),
  date,
  note: "",
});

/**
 * Admin-only manual billing desk: raise a quotation or a final settlement
 * invoice for props handed over off-portal (phone-call rentals), then print,
 * download or WhatsApp it straight to the client.
 */
export function DirectInvoiceModal({
  open,
  onOpenChange,
  invoice,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When present the modal edits an already-saved billing record. */
  invoice?: Invoice | null;
}) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<QuoteDocKind>("settlement");
  const [preview, setPreview] = useState(false);

  const [contact, setContact] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [house, setHouse] = useState("");
  const [movie, setMovie] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [returnDate, setReturnDate] = useState(today);
  const [deposit, setDeposit] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ManualLine[]>([newLine()]);
  const [shootRows, setShootRows] = useState<ShootRow[]>([newShootRow()]);

  /** Editing a saved record: rebuild the form from the stored document. */
  useEffect(() => {
    if (!open || !invoice) return;
    setKind(invoice.doc_type === "QUOTATION" ? "quotation" : "settlement");
    setPreview(false);
    setContact(invoice.client_name ?? "");
    setPhone(invoice.client_phone ?? "");
    setHouse(invoice.production_house ?? "");
    setLocation(invoice.shoot_location ?? "");
    setStartDate(invoice.shoot_start_date ?? today());
    setReturnDate(invoice.shoot_wrap_date ?? today());
    setDeposit(invoice.security_deposit ?? 0);
    setAdvance(invoice.advance_received ?? 0);
    setLines(
      (invoice.items ?? []).map((i) => ({
        key: Math.random().toString(36).slice(2, 9),
        prop_name: i.prop_name,
        prop_specs: "",
        serial_number: i.serial_number ?? "",
        quantity: i.quantity,
        daily_rate: i.custom_daily_rate,
      })),
    );
    const noteLines = (invoice.notes ?? "").split("\n");
    const dayLine = noteLines.find((l) => /^Shooting days billed/i.test(l.trim()));
    const dates = dayLine
      ? dayLine.slice(dayLine.indexOf(":") + 1).split(",").map((d) => d.trim()).filter(Boolean)
      : [];
    setShootRows(dates.length ? dates.map((d) => newShootRow(d)) : [newShootRow(invoice.shoot_start_date)]);
    setNotes(noteLines.filter((l) => !/^Shooting days billed/i.test(l.trim())).join("\n").trim());
  }, [open, invoice]);

  /** Billing runs on logged shooting dates only, never on the custody window. */
  const shootDates = useMemo(() => {
    const seen = new Set<string>();
    return shootRows
      .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && !seen.has(r.date) && seen.add(r.date) !== null)
      .map((r) => ({ date: r.date, note: r.note.trim() }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [shootRows]);
  const days = Math.max(1, shootDates.length);
  const rentTotal = lines.reduce((s, l) => s + l.daily_rate * l.quantity * days, 0);
  const balance = rentTotal + deposit - advance;

  const doc: QuoteRequest = useMemo(
    () => ({
      id: 0,
      quote_code: `SCP-MAN-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      user_id: "manual",
      production_house: house || contact,
      production_house_id: null,
      movie_name: movie,
      client_designation: designation,
      contact_person: contact,
      phone,
      shoot_location: location,
      shoot_start_date: startDate,
      estimated_return_date: returnDate,
      estimated_days: days,
      actual_return_date: returnDate,
      actual_days_used: days,
      items: lines.map((l, idx) => ({
        prop_id: idx + 1,
        prop_name: l.prop_name || "Prop item",
        prop_specs: l.prop_specs,
        serial_number: l.serial_number,
        godown_name: "",
        rack_name: "",
        quantity: l.quantity,
        daily_rate: l.daily_rate,
        line_total: l.daily_rate * l.quantity * days,
      })),
      estimated_total: rentTotal,
      security_deposit: deposit,
      advance_required: advance,
      advance_paid: advance,
      final_total: rentTotal,
      balance_due: balance,
      status: kind === "settlement" ? "settled" : "quote_sent",
      payment_reference: null,
      payment_proof_url: null,
      admin_notes: notes || null,
      client_notes: null,
      created_at: new Date().toISOString(),
      accepted_at: null,
      advance_receipt_no: null,
      advance_mode: advance > 0 ? "Manual" : null,
      advance_utr: null,
      advance_verified_at: advance > 0 ? new Date().toISOString() : null,
      dispatch_at: startDate,
      dispatch_vehicle: null,
      dispatch_notes: null,
      balance_cleared_at: null,
      crew_assignments: [],
      labour_days: [],
      labour_total: 0,
      labour_settled_amount: 0,
      labour_status: "pending",
      labour_cleared_at: null,
      labour_invoice_no: null,
      settled_amount: 0,
      settlement_waived: 0,
      shoot_days: shootDates,
    }),
    [
      house,
      contact,
      movie,
      designation,
      phone,
      location,
      startDate,
      returnDate,
      days,
      shootDates,
      lines,
      rentTotal,
      deposit,
      advance,
      balance,
      kind,
      notes,
    ],
  );

  const save = useMutation({
    mutationFn: () => {
      const draft = {
        invoice_number: doc.quote_code.replace("SCP-MAN", kind === "settlement" ? "SCP-INV" : "SCP-QTN"),
        doc_type: kind === "settlement" ? "INVOICE" : "QUOTATION",
        client_id: 0,
        client_name: contact,
        client_phone: phone,
        production_house: house,
        shoot_location: location,
        shoot_start_date: startDate,
        shoot_wrap_date: returnDate,
        items: doc.items.map((i) => ({
          prop_id: i.prop_id,
          prop_name: i.prop_name,
          serial_number: i.serial_number,
          condition_rating: "Good" as const,
          quantity: i.quantity,
          number_of_days: days,
          custom_daily_rate: i.daily_rate,
          total_price: i.line_total,
        })),
        subtotal: rentTotal,
        discount: 0,
        transport_charges: 0,
        gst_percent: 0,
        gst_amount: 0,
        security_deposit: deposit,
        advance_received: advance,
        balance_payable: balance,
        payment_status: balance <= 0 ? "Paid" : advance > 0 ? "Partial" : "Pending",
        notes: [
          notes,
          shootDates.length > 0
            ? `Shooting days billed (${shootDates.length}): ${shootDates.map((d) => d.date).join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      };
      if (invoice) {
        return api
          .updateInvoice(invoice.id, { ...draft, invoice_number: invoice.invoice_number })
          .then(() => ({ invoice_number: invoice.invoice_number }));
      }
      return api.createInvoice(draft);
    },
    onSuccess: (res) => {
      toast.success(`${res.invoice_number} ${invoice ? "updated" : "saved to billing records"}`);
      void qc.invalidateQueries({ queryKey: queryKeys.invoices });
    },
    onError: (e: Error) => toast.error("Could not save the document", { description: e.message }),
  });

  const valid = contact.trim() !== "" && lines.some((l) => l.prop_name.trim() !== "" && l.daily_rate > 0);

  function shareOnWhatsApp() {
    const label = kind === "settlement" ? "Invoice" : "Quotation";
    const body = [
      "🎬 *Surya Cine Special Props*",
      "",
      `Hi ${contact}, here is your ${label} for *${movie || house || "your shoot"}*.`,
      `*Ref:* ${doc.quote_code}`,
      `*Shooting Days Billed:* ${shootDates.length} (${shootDates.map((d) => d.date).join(", ")})`,
      `*Rental (${days} day(s)):* ${inr(rentTotal)}`,
      deposit > 0 ? `*Security Deposit:* ${inr(deposit)}` : "",
      advance > 0 ? `*Advance Received:* ${inr(advance)}` : "",
      `*Balance Payable:* ${inr(balance)}`,
      "",
      "The signed PDF copy is attached in this chat.",
    ]
      .filter(Boolean)
      .join("\n");
    openWhatsAppTo(phone, body);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-3xl overflow-y-auto border-primary/25 bg-card">
        <DialogHeader className="print:hidden">
          <DialogTitle className="font-display text-2xl tracking-wide text-gradient-gold">
            {invoice ? `Edit ${invoice.invoice_number}` : "Raise Direct Invoice"}
          </DialogTitle>
          <DialogDescription>
            For props already handed over by phone — bill the client without a portal quotation,
            then print, download or WhatsApp the document.
          </DialogDescription>
        </DialogHeader>

        {preview ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => setPreview(false)}>
                Back to edit
              </Button>
              <Button size="sm" onClick={shareOnWhatsApp} disabled={!phone}>
                <Send className="size-4" /> Send on WhatsApp
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => save.mutate()}
                disabled={save.isPending}
              >
                <FileText className="size-4" />{" "}
                {save.isPending ? "Saving…" : invoice ? "Update record" : "Save to records"}
              </Button>
            </div>
            <QuoteDocument quote={doc} kind={kind} />
          </div>
        ) : (
          <div className="space-y-4 print:hidden">
            <div className="flex flex-wrap gap-2">
              {(["settlement", "quotation"] as QuoteDocKind[]).map((k) => (
                <Button
                  key={k}
                  size="sm"
                  variant={kind === k ? "default" : "outline"}
                  onClick={() => setKind(k)}
                >
                  {k === "settlement" ? "Final Invoice" : "Quotation"}
                </Button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Client Name" value={contact} onChange={setContact} placeholder="Ravi Kumar" />
              <Field label="Designation" value={designation} onChange={setDesignation} placeholder="Art Director" />
              <Field label="Phone (WhatsApp)" value={phone} onChange={setPhone} placeholder="98490 05451" />
              <Field label="Production House" value={house} onChange={setHouse} placeholder="Sun Pictures" />
              <Field label="Movie / Project" value={movie} onChange={setMovie} placeholder="Project name" />
              <Field label="Shoot Location" value={location} onChange={setLocation} placeholder="EVP Film City" />
              <div className="space-y-1.5">
                <Label htmlFor="di-start">Dispatch Date (custody only)</Label>
                <Input id="di-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="di-return">Return Date (custody only)</Label>
                <Input id="di-return" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-primary/20 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Shooting days billed · {shootDates.length} day(s)
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShootRows([...shootRows, newShootRow()])}
                >
                  <CalendarPlus className="size-4" /> Add shooting day
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Rent is calculated only on these dates — not on the dispatch → return window.
              </p>
              {shootRows.map((r, idx) => (
                <div key={r.key} className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
                  <span className="w-24 text-xs font-semibold uppercase tracking-wider text-primary">
                    Day {idx + 1}
                  </span>
                  <Input
                    className="w-44"
                    type="date"
                    value={r.date}
                    onChange={(e) =>
                      setShootRows((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, date: e.target.value } : x)),
                      )
                    }
                  />
                  <Input
                    className="min-w-40 flex-1"
                    placeholder="Scene / location note (optional)"
                    value={r.note}
                    onChange={(e) =>
                      setShootRows((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, note: e.target.value } : x)),
                      )
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remove shooting day"
                    onClick={() => setShootRows(shootRows.filter((x) => x.key !== r.key))}
                    disabled={shootRows.length === 1}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2 rounded-xl border border-primary/20 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Props billed · {days} shooting day(s)
                </p>
                <Button size="sm" variant="outline" onClick={() => setLines([...lines, newLine()])}>
                  <Plus className="size-4" /> Add item
                </Button>
              </div>
              {lines.map((l, idx) => (
                <div key={l.key} className="grid gap-2 border-t border-border/60 pt-2 sm:grid-cols-[1fr_auto]">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input
                      placeholder="Prop name"
                      value={l.prop_name}
                      onChange={(e) => patch(idx, { prop_name: e.target.value })}
                    />
                    <Input
                      placeholder="Specs / dimensions"
                      value={l.prop_specs}
                      onChange={(e) => patch(idx, { prop_specs: e.target.value })}
                    />
                    <Input
                      placeholder="Serial no"
                      value={l.serial_number}
                      onChange={(e) => patch(idx, { serial_number: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-20"
                      type="number"
                      min={1}
                      value={l.quantity}
                      onChange={(e) => patch(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                    />
                    <Input
                      className="w-28"
                      type="number"
                      min={0}
                      placeholder="Rate/day"
                      value={l.daily_rate}
                      onChange={(e) => patch(idx, { daily_rate: Math.max(0, Number(e.target.value)) })}
                    />
                    <span className="w-24 text-right font-display text-lg tracking-wide text-primary">
                      {inr(l.daily_rate * l.quantity * days)}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove item"
                      onClick={() => setLines(lines.filter((x) => x.key !== l.key))}
                      disabled={lines.length === 1}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="di-dep">Security Deposit ₹</Label>
                <Input id="di-dep" type="number" min={0} value={deposit} onChange={(e) => setDeposit(Math.max(0, Number(e.target.value)))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="di-adv">Advance Received ₹</Label>
                <Input id="di-adv" type="number" min={0} value={advance} onChange={(e) => setAdvance(Math.max(0, Number(e.target.value)))} />
              </div>
              <div className="space-y-1.5">
                <Label>Balance Payable</Label>
                <p className="font-display text-2xl tracking-wide text-primary">{inr(balance)}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="di-notes">Notes on the document</Label>
              <Textarea id="di-notes" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <Button className="w-full" disabled={!valid} onClick={() => setPreview(true)}>
              <FileText className="size-4" /> Generate {kind === "settlement" ? "Invoice" : "Quotation"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  function patch(idx: number, next: Partial<ManualLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...next } : l)));
  }
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = `di-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
