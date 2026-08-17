import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Minus, Plus, Receipt, Search, Trash2, UserPlus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, queryKeys } from "@/lib/api";
import { inr, nextDocNumber, shootDays } from "@/lib/format";
import type { CartLine, Client, DocType, Invoice, InvoiceDraft, Prop } from "@/lib/types";

const GST_OPTIONS = [0, 12, 18] as const;
const today = () => new Date().toISOString().slice(0, 10);

export function PosCart({
  open,
  onOpenChange,
  props,
  clients,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  props: Prop[];
  clients: Client[];
  onCreated: (invoice: Invoice) => void;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [quickAdd, setQuickAdd] = useState(false);
  const [newClient, setNewClient] = useState({
    contact_person: "",
    phone: "",
    production_house: "",
    gst_number: "",
    address: "",
  });
  const [shootLocation, setShootLocation] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [wrapDate, setWrapDate] = useState(today);
  const [days, setDays] = useState(1);
  const [deposit, setDeposit] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [transport, setTransport] = useState(0);
  const [gstPercent, setGstPercent] = useState<number>(18);

  const matches = useMemo(() => {
    if (search.trim() === "") return [];
    const term = search.toLowerCase();
    return props
      .filter((p) => `${p.title} ${p.serial_number}`.toLowerCase().includes(term))
      .slice(0, 6);
  }, [props, search]);

  const subtotal = lines.reduce((sum, l) => sum + l.custom_daily_rate * l.quantity * days, 0);
  const taxable = Math.max(subtotal - discount + transport, 0);
  const gstAmount = Math.round((taxable * gstPercent) / 100);
  const balance = taxable + gstAmount + deposit - advance;
  const selectedClient = clients.find((c) => String(c.id) === clientId);

  function syncDates(nextStart: string, nextWrap: string) {
    setStartDate(nextStart);
    setWrapDate(nextWrap);
    const d = shootDays(nextStart, nextWrap);
    if (d > 0) setDays(d);
  }

  function addLine(prop: Prop) {
    setSearch("");
    setLines((old) => {
      if (old.some((l) => l.prop_id === prop.id)) {
        return old.map((l) => (l.prop_id === prop.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...old,
        {
          prop_id: prop.id,
          prop_name: prop.title,
          serial_number: prop.serial_number,
          condition_rating: prop.condition_rating,
          base_daily_rate: prop.daily_rate,
          custom_daily_rate: prop.daily_rate,
          quantity: 1,
        },
      ];
    });
    setDeposit((d) => d + prop.security_deposit);
  }

  function patchLine(propId: number, patch: Partial<CartLine>) {
    setLines((old) => old.map((l) => (l.prop_id === propId ? { ...l, ...patch } : l)));
  }

  const create = useMutation({
    mutationFn: async (docType: DocType) => {
      let client = selectedClient;
      if (!client) {
        client = await api.createClient({
          production_house: newClient.production_house || newClient.contact_person,
          contact_person: newClient.contact_person,
          phone: newClient.phone,
          ...(newClient.gst_number ? { gst_number: newClient.gst_number } : {}),
          ...(newClient.address ? { address: newClient.address } : {}),
        });
        qc.setQueryData<Client[]>(queryKeys.clients, (old) => [...(old ?? []), client as Client]);
      }
      const draft: InvoiceDraft = {
        invoice_number: nextDocNumber(docType),
        doc_type: docType,
        client_id: client.id,
        client_name: client.contact_person,
        client_phone: client.phone,
        production_house: client.production_house,
        ...(shootLocation ? { shoot_location: shootLocation } : {}),
        shoot_start_date: startDate,
        shoot_wrap_date: wrapDate,
        items: lines.map((l) => ({
          prop_id: l.prop_id,
          prop_name: l.prop_name,
          serial_number: l.serial_number,
          condition_rating: l.condition_rating,
          quantity: l.quantity,
          number_of_days: days,
          custom_daily_rate: l.custom_daily_rate,
          total_price: l.custom_daily_rate * l.quantity * days,
        })),
        subtotal,
        discount,
        transport_charges: transport,
        gst_percent: gstPercent,
        gst_amount: gstAmount,
        security_deposit: deposit,
        advance_received: advance,
        balance_payable: balance,
        payment_status: advance <= 0 ? "Pending" : balance <= 0 ? "Paid" : "Partial",
      };
      const res = await api.createInvoice(draft);
      return { ...draft, id: res.id, invoice_number: res.invoice_number, created_at: new Date().toISOString() } as Invoice;
    },
    onSuccess: (invoice) => {
      qc.setQueryData<Invoice[]>(queryKeys.invoices, (old) => [invoice, ...(old ?? [])]);
      if (invoice.doc_type === "INVOICE") {
        qc.setQueryData<Prop[]>(queryKeys.props, (old) =>
          (old ?? []).map((p) =>
            invoice.items.some((i) => i.prop_id === p.id) ? { ...p, status: "Booked" } : p,
          ),
        );
        void qc.invalidateQueries({ queryKey: queryKeys.bookings });
      }
      toast.success(
        invoice.doc_type === "INVOICE" ? "Rental order & invoice created" : "Quotation generated",
        { description: invoice.invoice_number },
      );
      onOpenChange(false);
      setLines([]);
      onCreated(invoice);
    },
    onError: (e: Error) => toast.error("Could not save document", { description: e.message }),
  });

  const clientReady = Boolean(selectedClient) || (newClient.contact_person && newClient.phone);
  const ready = lines.length > 0 && clientReady && days > 0 && !create.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-6xl overflow-y-auto border-primary/25 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide text-gradient-gold">
            Rental Cart &amp; Billing Engine
          </DialogTitle>
          <DialogDescription>
            Add multiple props, override daily rates per production, then issue a quotation or a GST rental invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Cart */}
          <section className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search props to add (title or serial)"
                aria-label="Search props to add"
                className="pl-9"
              />
              {matches.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-primary/30 bg-popover shadow-cine">
                  {matches.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => addLine(p)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-secondary"
                      >
                        <span>
                          <span className="font-semibold">{p.title}</span>
                          <span className="ml-2 font-mono text-[11px] text-muted-foreground">{p.serial_number}</span>
                        </span>
                        <span className="whitespace-nowrap text-primary">{inr(p.daily_rate)}/day</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-primary/20">
              {lines.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  Cart is empty — search above to add props.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {lines.map((l) => (
                    <li key={l.prop_id} className="grid gap-3 p-3 sm:grid-cols-[1fr_auto]">
                      <div>
                        <p className="font-semibold leading-tight">{l.prop_name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {l.serial_number} · {l.condition_rating} · base {inr(l.base_daily_rate)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="w-32 space-y-1">
                          <Label className="text-[10px] uppercase tracking-wider">Custom Rate/Day</Label>
                          <Input
                            type="number"
                            value={l.custom_daily_rate}
                            onChange={(e) => patchLine(l.prop_id, { custom_daily_rate: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase tracking-wider">Qty</Label>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              aria-label="Decrease quantity"
                              onClick={() => patchLine(l.prop_id, { quantity: Math.max(1, l.quantity - 1) })}
                            >
                              <Minus className="size-3.5" />
                            </Button>
                            <span className="w-8 text-center font-semibold">{l.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              aria-label="Increase quantity"
                              onClick={() => patchLine(l.prop_id, { quantity: l.quantity + 1 })}
                            >
                              <Plus className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="min-w-24 text-right">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Line Total</p>
                          <p className="font-display text-xl tracking-wide text-primary">
                            {inr(l.custom_daily_rate * l.quantity * days)}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label={`Remove ${l.prop_name}`}
                          onClick={() => setLines((old) => old.filter((x) => x.prop_id !== l.prop_id))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Shoot Start">
                <Input type="date" value={startDate} onChange={(e) => syncDates(e.target.value, wrapDate)} />
              </Field>
              <Field label="Wrap Date">
                <Input type="date" value={wrapDate} onChange={(e) => syncDates(startDate, e.target.value)} />
              </Field>
              <Field label="Shoot Days">
                <Input type="number" min={1} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value)))} />
              </Field>
              <Field label="Shoot Location" className="sm:col-span-3">
                <Input
                  value={shootLocation}
                  onChange={(e) => setShootLocation(e.target.value)}
                  placeholder="EVP Film City, Chennai"
                />
              </Field>
            </div>
          </section>

          {/* Client + money */}
          <section className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Client / Production House</Label>
                <Button size="sm" variant="outline" onClick={() => setQuickAdd((v) => !v)}>
                  <UserPlus className="size-3.5" /> {quickAdd ? "Pick existing" : "Quick add"}
                </Button>
              </div>
              {quickAdd ? (
                <div className="grid gap-3 rounded-xl border border-primary/20 p-3">
                  <Input
                    value={newClient.contact_person}
                    onChange={(e) => setNewClient({ ...newClient, contact_person: e.target.value })}
                    placeholder="Client name *"
                  />
                  <Input
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    placeholder="Phone number *"
                  />
                  <Input
                    value={newClient.production_house}
                    onChange={(e) => setNewClient({ ...newClient, production_house: e.target.value })}
                    placeholder="Production name"
                  />
                  <Input
                    value={newClient.gst_number}
                    onChange={(e) => setNewClient({ ...newClient, gst_number: e.target.value })}
                    placeholder="GSTIN"
                  />
                  <Input
                    value={newClient.address}
                    onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                    placeholder="Address"
                  />
                </div>
              ) : (
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.production_house} — {c.contact_person}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Security Deposit (₹)">
                <Input type="number" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} />
              </Field>
              <Field label="Advance Received (₹)">
                <Input type="number" value={advance} onChange={(e) => setAdvance(Number(e.target.value))} />
              </Field>
              <Field label="Discount (₹)">
                <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
              </Field>
              <Field label="Transport / Packaging (₹)">
                <Input type="number" value={transport} onChange={(e) => setTransport(Number(e.target.value))} />
              </Field>
              <Field label="GST" className="sm:col-span-2">
                <div className="flex gap-2">
                  {GST_OPTIONS.map((g) => (
                    <Button
                      key={g}
                      type="button"
                      variant={gstPercent === g ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGstPercent(g)}
                    >
                      {g}%
                    </Button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="surface-metal space-y-1.5 rounded-xl border border-primary/30 p-4 text-sm">
              <Row label="Subtotal" value={inr(subtotal)} />
              <Row label="Discount" value={`− ${inr(discount)}`} />
              <Row label="Transport" value={inr(transport)} />
              <Row label={`GST @ ${gstPercent}%`} value={inr(gstAmount)} />
              <Row label="Security Deposit" value={inr(deposit)} />
              <Row label="Advance Received" value={`− ${inr(advance)}`} />
              <div className="mt-2 flex items-center justify-between border-t border-primary/30 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Balance Due</span>
                <span className="font-display text-2xl tracking-wide text-gradient-gold">{inr(balance)}</span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" disabled={!ready} onClick={() => create.mutate("QUOTATION")}>
                <FileText className="size-4" /> Generate Quotation
              </Button>
              <Button disabled={!ready} onClick={() => create.mutate("INVOICE")}>
                <Receipt className="size-4" /> Create Rental Order &amp; Invoice
              </Button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-[10px] uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}