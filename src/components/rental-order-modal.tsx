import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Truck } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { api, queryKeys } from "@/lib/api";
import { inr } from "@/lib/format";
import type { Prop, RentalOrder, RentalOrderItem } from "@/lib/types";

type Line = Omit<RentalOrderItem, "actual_days_used" | "line_total">;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Stage 1 — estimated delivery challan created when props leave the warehouse. */
export function RentalOrderModal({
  open,
  onOpenChange,
  props,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  props: Prop[];
  onCreated: (order: RentalOrder) => void;
}) {
  const qc = useQueryClient();
  const [clientName, setClientName] = useState("");
  const [productionHouse, setProductionHouse] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [dispatch, setDispatch] = useState(today);
  const [estDays, setEstDays] = useState(10);
  const [advance, setAdvance] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return props
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) || p.serial_number.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [props, search]);

  const days = Math.max(1, estDays || 1);
  const subtotal = lines.reduce((s, l) => s + l.manual_daily_rate * l.quantity * days, 0);

  function addLine(prop: Prop) {
    setSearch("");
    setLines((prev) =>
      prev.some((l) => l.prop_id === prop.id)
        ? prev
        : [
            ...prev,
            {
              prop_id: prop.id,
              prop_name: prop.title,
              prop_description: prop.description_specs || prop.description,
              serial_number: prop.serial_number,
              quantity: 1,
              manual_daily_rate: 0,
              estimated_days: days,
            },
          ],
    );
  }

  function patchLine(propId: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.prop_id === propId ? { ...l, ...patch } : l)));
  }

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.createRentalOrder({
        client_name: clientName,
        production_house: productionHouse,
        phone_number: phone,
        shoot_location: location,
        dispatch_date: dispatch,
        estimated_return_date: addDays(dispatch, days),
        estimated_days: days,
        advance_received: advance,
        security_deposit: deposit,
        notes,
        items: lines.map((l) => ({ ...l, estimated_days: days })),
      }),
    onSuccess: (order) => {
      toast.success(`Challan ${order.order_number} created`, {
        description: "Props marked On-Set. Print the estimated rental delivery slip.",
      });
      void qc.invalidateQueries({ queryKey: queryKeys.orders });
      void qc.invalidateQueries({ queryKey: queryKeys.props });
      setLines([]);
      setNotes("");
      onOpenChange(false);
      onCreated(order);
    },
    onError: (e: Error) => toast.error("Could not create order", { description: e.message }),
  });

  const valid = clientName.trim() && phone.trim() && lines.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto border-primary/25 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide text-gradient-gold">
            New Rental Order — Estimated Delivery Challan
          </DialogTitle>
          <DialogDescription>
            Set a manual daily rate per prop for this production. Final bill recalculates on actual return.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client / Producer Name">
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="R. Surya" />
          </Field>
          <Field label="Production House">
            <Input
              value={productionHouse}
              onChange={(e) => setProductionHouse(e.target.value)}
              placeholder="Vetri Cinemas"
            />
          </Field>
          <Field label="Contact Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98400 00000" />
          </Field>
          <Field label="Shoot Location">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Annapurna Studio, Hyderabad" />
          </Field>
          <Field label="Dispatch Date">
            <Input type="date" value={dispatch} onChange={(e) => setDispatch(e.target.value)} />
          </Field>
          <Field label="Estimated Days">
            <Input
              type="number"
              min={1}
              value={estDays}
              onChange={(e) => setEstDays(Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
          <Field label="Advance Taken (₹)">
            <Input type="number" min={0} value={advance} onChange={(e) => setAdvance(Number(e.target.value) || 0)} />
          </Field>
          <Field label="Security Deposit (₹)">
            <Input type="number" min={0} value={deposit} onChange={(e) => setDeposit(Number(e.target.value) || 0)} />
          </Field>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Add Props (search title or serial)
          </Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Komodo, SCP-CAM-0007…" />
          {results.length > 0 && (
            <div className="rounded-lg border border-primary/25 bg-secondary/60">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addLine(p)}
                  className="flex w-full items-center justify-between gap-3 border-b border-border/60 px-3 py-2 text-left text-sm last:border-0 hover:bg-primary/10"
                >
                  <span>
                    {p.title}{" "}
                    <span className="font-mono text-[11px] text-muted-foreground">{p.serial_number}</span>
                  </span>
                  <Plus className="size-4 text-primary" />
                </button>
              ))}
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-primary/20">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <th className="px-3 py-2">Item &amp; Configuration</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Rate / Day (₹)</th>
                  <th className="px-3 py-2">Line Total</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.prop_id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">
                      <p className="font-semibold">{l.prop_name}</p>
                      <p className="text-[11px] text-muted-foreground">{l.prop_description}</p>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={1}
                        className="w-20"
                        value={l.quantity}
                        onChange={(e) =>
                          patchLine(l.prop_id, { quantity: Math.max(1, Number(e.target.value) || 1) })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        className="w-28"
                        value={l.manual_daily_rate}
                        onChange={(e) =>
                          patchLine(l.prop_id, { manual_daily_rate: Number(e.target.value) || 0 })
                        }
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold">
                      {inr(l.manual_daily_rate * l.quantity * days)}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLines((prev) => prev.filter((x) => x.prop_id !== l.prop_id))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="surface-metal rounded-lg border border-primary/25 p-4 text-sm">
          <p className="font-display text-lg tracking-wider text-primary">
            Estimated Total ({days} day{days > 1 ? "s" : ""}): {inr(subtotal)}
          </p>
          <p className="mt-1 text-muted-foreground">
            Advance {inr(advance)} · Deposit {inr(deposit)} · Estimated balance {inr(subtotal - advance)}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || isPending} onClick={() => mutate()}>
            <Truck className="size-4" />
            {isPending ? "Creating…" : "Create Challan & Dispatch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
