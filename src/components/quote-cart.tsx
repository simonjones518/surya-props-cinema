import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
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
import { ProductionHouseSelect } from "@/components/production-house-select";
import { portal, portalKeys } from "@/lib/portal-api";
import { savePendingQuote } from "@/lib/pending-quote";
import { newQuoteRequestMessage, openWhatsApp } from "@/lib/whatsapp";
import { useWishlist } from "@/lib/wishlist";
import type { QuoteRequest, QuoteRequestDraft } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

export function QuoteCart({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { lines, setQuantity, remove, clear, count } = useWishlist();
  const session = useQuery({ queryKey: portalKeys.session, queryFn: portal.session });
  const [banner, setBanner] = useState("");
  const [movie, setMovie] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState(today);
  const [ret, setRet] = useState(today);
  const [notes, setNotes] = useState("");

  const draft = (): QuoteRequestDraft => ({
    production_house: banner,
    movie_name: movie,
    shoot_location: location,
    shoot_start_date: start,
    estimated_return_date: ret,
    client_notes: notes,
    items: lines.map((l) => ({ prop_id: l.prop_id, quantity: l.quantity })),
  });

  const submit = useMutation({
    mutationFn: () => portal.requestQuote(draft()),
    onSuccess: (res) => {
      qc.setQueryData<QuoteRequest[]>(portalKeys.myQuotes, (current) => {
        const withoutSaved = (current ?? []).filter((quote) => quote.id !== res.id);
        return [res, ...withoutSaved];
      });
      toast.success("Quote request sent to the production desk", {
        description: `Reference ${res.quote_code} · track it in your portal`,
      });
      openWhatsApp(newQuoteRequestMessage(res));
      clear();
      setNotes("");
      setMovie("");
      void qc.invalidateQueries({ queryKey: portalKeys.myQuotes });
      void qc.invalidateQueries({ queryKey: portalKeys.productionHouses });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Could not send the request", { description: e.message }),
  });

  const signedIn = Boolean(session.data);
  const ready =
    count > 0 &&
    banner.trim() !== "" &&
    movie.trim() !== "" &&
    location.trim() !== "" &&
    start !== "" &&
    ret !== "";

  /** Signed out → park the draft and ask for login; it auto-submits after sign-in. */
  function handleSubmit() {
    if (!signedIn) {
      savePendingQuote(draft());
      toast.info("Please sign in to raise this rental quote request");
      onOpenChange(false);
      void navigate({ to: "/auth" });
      return;
    }
    submit.mutate();
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[100dvh] w-full max-w-2xl overflow-y-auto rounded-none border-primary/25 bg-card p-4 sm:max-h-[92vh] sm:rounded-lg sm:p-6 max-sm:h-[100dvh] max-sm:top-0 max-sm:translate-y-0">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide text-gradient-gold">
            Shoot Wishlist
          </DialogTitle>
          <DialogDescription>
            Send your prop list to our production desk. Rates are quoted per production — you'll see
            the full breakdown in your client portal.
          </DialogDescription>
        </DialogHeader>

        {count === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Your wishlist is empty. Add props from the catalog.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-primary/20">
            {lines.map((l) => (
              <li key={l.prop_id} className="flex items-center justify-between gap-3 p-3">
                <p className="text-sm font-semibold">{l.title}</p>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={`Decrease ${l.title}`}
                    onClick={() => setQuantity(l.prop_id, l.quantity - 1)}
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="w-8 text-center font-semibold">{l.quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={`Increase ${l.title}`}
                    onClick={() => setQuantity(l.prop_id, l.quantity + 1)}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={`Remove ${l.title}`}
                    onClick={() => remove(l.prop_id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="wl-banner">Production House</Label>
            <ProductionHouseSelect id="wl-banner" value={banner} onChange={setBanner} />
            <p className="text-[11px] text-muted-foreground">
              Search the banner you're shooting for, or add a new one.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wl-movie">Movie / Project Name</Label>
            <Input
              id="wl-movie"
              value={movie}
              onChange={(e) => setMovie(e.target.value)}
              placeholder="Vetri Kodi Kattu"
              maxLength={160}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="wl-location">Shoot Location</Label>
            <Input
              id="wl-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="EVP Film City, Chennai"
              maxLength={240}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wl-start">Shoot Start Date</Label>
            <Input id="wl-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wl-return">Estimated Return Date</Label>
            <Input id="wl-return" type="date" value={ret} onChange={(e) => setRet(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="wl-notes">Notes for the production desk</Label>
            <Textarea
              id="wl-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Scene context, transport needs, on-set handling crew…"
            />
          </div>
        </div>

        {!signedIn && (
          <p className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-muted-foreground">
            <Link to="/auth" className="font-semibold text-primary underline">
              Sign in or create a production account
            </Link>{" "}
            to submit this wishlist and track your quotations.
          </p>
        )}

        <Button
          className="w-full"
          disabled={!ready || submit.isPending}
          onClick={() => submit.mutate()}
        >
          <ShoppingBag className="size-4" />
          {submit.isPending ? "Sending…" : "Request Rental Quote"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
