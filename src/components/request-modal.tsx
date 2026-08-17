import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
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
import { api } from "@/lib/api";
import { prettyDate, shootDays } from "@/lib/format";
import { openWhatsApp } from "@/lib/whatsapp";
import type { Prop } from "@/lib/types";

/** Customer request for a specific catalog prop. */
export function RequestModal({
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
  const [shootLocation, setShootLocation] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const days = shootDays(start, wrap);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      if (!prop) throw new Error("No prop selected");
      return api.createPropRequest({
        request_type: "Catalog",
        prop_id: prop.id,
        prop_title: `${prop.title} (${prop.serial_number})`,
        production_house: productionHouse,
        contact_person: contactPerson,
        phone,
        shoot_location: shootLocation,
        shoot_start_date: start || null,
        shoot_wrap_date: wrap || null,
        quantity,
        notes,
      });
    },
    onSuccess: (res) => {
      const lines = [
        `*Surya Cine Special Props — Prop Request*`,
        `Request: ${res.request_code}`,
        `Prop: ${prop?.title} (${prop?.serial_number}) ×${quantity}`,
        prop?.description_specs ? `Specs: ${prop.description_specs}` : "",
        productionHouse ? `Production house: ${productionHouse}` : "",
        `Contact: ${contactPerson} — ${phone}`,
        shootLocation ? `Shoot location: ${shootLocation}` : "",
        start && wrap ? `Shoot: ${prettyDate(start)} → ${prettyDate(wrap)} (${days} day(s))` : "",
        notes ? `Notes: ${notes}` : "",
      ].filter(Boolean);
      openWhatsApp(lines.join("\n"));
      toast.success(`Request ${res.request_code} sent`, {
        description: "Saved to our production desk — continue on WhatsApp to confirm.",
      });
      onOpenChange(false);
      setNotes("");
    },
    onError: (e: Error) => toast.error("Request failed", { description: e.message }),
  });

  const valid = Boolean(prop && contactPerson.trim() && phone.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-primary/25 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide text-gradient-gold">
            Request Rental Quote
          </DialogTitle>
          <DialogDescription>
            {prop ? `${prop.title} · ${prop.serial_number}` : ""} — our desk confirms availability and shares a custom quote on WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Production House">
            <Input value={productionHouse} onChange={(e) => setProductionHouse(e.target.value)} placeholder="Vetri Cinemas" />
          </Field>
          <Field label="Your Name">
            <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Line producer" />
          </Field>
          <Field label="WhatsApp / Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98400 00000" />
          </Field>
          <Field label="Quantity">
            <Input
              type="number"
              min={1}
              max={99}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
          <Field label="Shoot Start">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Wrap Date">
            <Input type="date" value={wrap} min={start || undefined} onChange={(e) => setWrap(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Shoot Location">
              <Input
                value={shootLocation}
                onChange={(e) => setShootLocation(e.target.value)}
                placeholder="EVP Film City, Chennai"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Requirement Notes">
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dressing changes, delivery location, armourer needed…"
              />
            </Field>
          </div>
        </div>

        {prop?.description_specs && (
          <div className="surface-metal rounded-lg border border-primary/25 p-4 text-sm">
            <p className="font-display text-lg tracking-wider text-primary">Configuration</p>
            <p className="mt-2 text-muted-foreground">
              {prop.description_specs}
              {days > 0 ? ` · ${days} shoot day(s) requested` : ""}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || isPending} onClick={() => mutate()}>
            <MessageCircle className="size-4" />
            {isPending ? "Sending…" : "Send Quote Request on WhatsApp"}
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
