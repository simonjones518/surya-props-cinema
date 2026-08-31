import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ProductionHouseSelect } from "@/components/production-house-select";
import { portal, portalKeys } from "@/lib/portal-api";
import { savePendingQuote } from "@/lib/pending-quote";
import { shootDays } from "@/lib/format";
import { newQuoteRequestMessage, openWhatsApp } from "@/lib/whatsapp";
import type { Prop, QuoteRequest, QuoteRequestDraft } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);


/**
 * Single-prop rental request. Writes a real `quote_requested` record into the
 * client's portal lifecycle first, then hands off to WhatsApp.
 */
export function RequestModal({
  prop,
  open,
  onOpenChange,
}: {
  prop: Prop | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const session = useQuery({ queryKey: portalKeys.session, queryFn: portal.session });
  const [productionHouse, setProductionHouse] = useState("");
  const [movie, setMovie] = useState("");
  const [start, setStart] = useState(today);
  const [wrap, setWrap] = useState(today);
  const [shootLocation, setShootLocation] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const days = shootDays(start, wrap);
  const signedIn = Boolean(session.data);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      if (!prop) throw new Error("No prop selected");
      return portal.requestQuote({
        production_house: productionHouse,
        movie_name: movie,
        shoot_location: shootLocation,
        shoot_start_date: start,
        estimated_return_date: wrap,
        client_notes: notes,
        items: [{ prop_id: prop.id, quantity }],
      });
    },
    onSuccess: (res) => {
      qc.setQueryData<QuoteRequest[]>(portalKeys.myQuotes, (current) => {
        const withoutSaved = (current ?? []).filter((quote) => quote.id !== res.id);
        return [res, ...withoutSaved];
      });
      toast.success(`Quote request ${res.quote_code} sent`, {
        description: "Track its status in your client portal — quotation follows shortly.",
      });
      openWhatsApp(newQuoteRequestMessage(res));
      void qc.invalidateQueries({ queryKey: portalKeys.myQuotes });
      void qc.invalidateQueries({ queryKey: portalKeys.productionHouses });
      onOpenChange(false);
      setNotes("");
      setMovie("");
    },
    onError: (e: Error) => toast.error("Request failed", { description: e.message }),
  });

  const valid = Boolean(
    prop &&
      signedIn &&
      productionHouse.trim() &&
      movie.trim() &&
      shootLocation.trim() &&
      start &&
      wrap,
  );

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
            <ProductionHouseSelect
              id="rq-banner"
              value={productionHouse}
              onChange={setProductionHouse}
            />
          </Field>
          <Field label="Movie / Project Name">
            <Input value={movie} onChange={(e) => setMovie(e.target.value)} placeholder="Vetri Kodi Kattu" maxLength={160} />
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
          <Field label="Estimated Return Date">
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

        {!signedIn && (
          <p className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-muted-foreground">
            <Link to="/auth" className="font-semibold text-primary underline">
              Sign in or create a production account
            </Link>{" "}
            to submit this request and track the quotation in your portal.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || isPending} onClick={() => mutate()}>
            <MessageCircle className="size-4" />
            {isPending ? "Sending…" : "Submit Quote Request"}
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
