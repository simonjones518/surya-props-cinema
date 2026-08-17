import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, LogOut, Receipt, Upload, Wallet } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { QuoteDocument, type QuoteDocKind } from "@/components/quote-document";
import { inr } from "@/lib/format";
import { portal, portalKeys, QUOTE_LABEL, QUOTE_TONE } from "@/lib/portal-api";
import type { ClientProfile, QuoteRequest } from "@/lib/types";

export const Route = createFileRoute("/client/portal")({
  head: () => ({
    meta: [
      { title: "Client Portal — Surya Cine Special Props" },
      {
        name: "description",
        content:
          "Your production dashboard: rental quotations, advance payments, active on-set shoots, settlement invoices and the full payment ledger.",
      },
      { property: "og:title", content: "Client Portal — Surya Cine Special Props" },
      {
        property: "og:description",
        content: "Track quotations, advances, active shoots and settlement invoices.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientPortal,
});

function StatusPill({ quote }: { quote: QuoteRequest }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${QUOTE_TONE[quote.status]}`}
    >
      {QUOTE_LABEL[quote.status]}
    </span>
  );
}

function ClientPortal() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const session = useQuery({ queryKey: portalKeys.session, queryFn: portal.session });
  const signedOut = session.isFetched && !session.data;

  useEffect(() => {
    if (signedOut) void navigate({ to: "/auth", replace: true });
  }, [signedOut, navigate]);

  const quotes = useQuery({
    queryKey: portalKeys.myQuotes,
    queryFn: portal.getMyQuotes,
    enabled: Boolean(session.data),
  });
  const payments = useQuery({
    queryKey: portalKeys.myPayments,
    queryFn: portal.getMyPayments,
    enabled: Boolean(session.data),
  });

  const [payFor, setPayFor] = useState<QuoteRequest | null>(null);
  const [doc, setDoc] = useState<{ quote: QuoteRequest; kind: QuoteDocKind } | null>(null);
  const [banner, setBanner] = useState("all");
  const [search, setSearch] = useState("");

  const signOut = useMutation({
    mutationFn: () => portal.signOut(),
    onSuccess: async () => {
      await qc.cancelQueries();
      qc.clear();
      await navigate({ to: "/", replace: true });
    },
  });

  if (session.isLoading || !session.data) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <Skeleton className="h-40 rounded-xl" />
      </main>
    );
  }

  const all = quotes.data ?? [];
  const banners = [...new Set(all.map((q) => q.production_house).filter(Boolean))].sort();
  const term = search.trim().toLowerCase();
  const matches = all.filter(
    (q) =>
      (banner === "all" || q.production_house === banner) &&
      (term === "" ||
        q.movie_name.toLowerCase().includes(term) ||
        q.quote_code.toLowerCase().includes(term)),
  );
  const active = matches.filter((q) => q.status !== "settled" && q.status !== "rejected");
  const settled = matches.filter((q) => q.status === "settled");

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.38em] text-primary">
            Client Portal
          </p>
          <h1 className="mt-2 text-4xl sm:text-5xl">
            <span className="text-gradient-gold">Your Shoots</span> &amp; Quotations
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{session.data.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/catalog">Browse Catalog</Link>
          </Button>
          <Button variant="outline" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
            <LogOut className="size-4" /> Sign Out
          </Button>
        </div>
      </header>

      <Tabs defaultValue="shoots" className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="shoots">Active Shoots &amp; Quotations</TabsTrigger>
          <TabsTrigger value="invoices">Invoices &amp; Receipts</TabsTrigger>
          <TabsTrigger value="ledger">Payment Ledger</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="shoots" className="mt-6 space-y-4">
          <ProjectFilters
            banners={banners}
            banner={banner}
            onBanner={setBanner}
            search={search}
            onSearch={setSearch}
          />
          {quotes.isLoading ? (
            <Skeleton className="h-36 rounded-xl" />
          ) : active.length === 0 ? (
            <EmptyState />
          ) : (
            active.map((quote) => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                onPay={() => setPayFor(quote)}
                onView={(kind) => setDoc({ quote, kind })}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="invoices" className="mt-6 space-y-4">
          {[...active, ...settled].length === 0 ? (
            <EmptyState />
          ) : (
            [...active, ...settled].map((quote) => (
              <div
                key={quote.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-card p-4"
              >
                <div>
                  <p className="font-display text-lg tracking-wide">{quote.quote_code}</p>
                  <p className="text-xs text-muted-foreground">
                    {quote.shoot_start_date} → {quote.actual_return_date ?? quote.estimated_return_date}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quote.status !== "quote_requested" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDoc({ quote, kind: "quotation" })}
                    >
                      <FileText className="size-4" /> Estimated Slip
                    </Button>
                  )}
                  {quote.status === "settled" && (
                    <Button size="sm" onClick={() => setDoc({ quote, kind: "settlement" })}>
                      <Receipt className="size-4" /> Final Settlement
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="ledger" className="mt-6">
          <div className="overflow-x-auto rounded-xl border border-primary/20 bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="p-3">Date</th>
                  <th className="p-3">Quote</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(payments.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No transactions yet.
                    </td>
                  </tr>
                ) : (
                  (payments.data ?? []).map((p) => (
                    <tr key={p.id} className="border-b border-border/60">
                      <td className="p-3">{new Date(p.created_at).toLocaleDateString("en-IN")}</td>
                      <td className="p-3 font-mono text-xs">#{p.quote_id}</td>
                      <td className="p-3 capitalize">{p.kind.replace("_", " ")}</td>
                      <td className="p-3 text-xs text-muted-foreground">{p.reference}</td>
                      <td className="p-3 text-right font-semibold text-primary">{inr(p.amount)}</td>
                      <td className="p-3 text-xs uppercase tracking-wider">{p.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <ProfileForm />
        </TabsContent>
      </Tabs>

      <AdvanceDialog quote={payFor} onOpenChange={(v) => !v && setPayFor(null)} />

      <Dialog open={doc !== null} onOpenChange={(v) => !v && setDoc(null)}>
        <DialogContent className="max-h-[94vh] max-w-3xl overflow-y-auto border-primary/25 bg-card">
          <DialogHeader className="print:hidden">
            <DialogTitle className="font-display text-2xl tracking-wide text-gradient-gold">
              Rental Document
            </DialogTitle>
            <DialogDescription>Print or save as PDF for your production records.</DialogDescription>
          </DialogHeader>
          {doc && <QuoteDocument quote={doc.quote} kind={doc.kind} />}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-primary/20 bg-card p-10 text-center">
      <p className="text-sm text-muted-foreground">No quotations yet.</p>
      <Button className="mt-4" asChild>
        <Link to="/catalog">Build a Shoot Wishlist</Link>
      </Button>
    </div>
  );
}

/** Multi-project filters: by production banner and by movie / quote code. */
function ProjectFilters({
  banners,
  banner,
  onBanner,
  search,
  onSearch,
}: {
  banners: string[];
  banner: string;
  onBanner: (v: string) => void;
  search: string;
  onSearch: (v: string) => void;
}) {
  if (banners.length === 0) return null;
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-primary/20 bg-card p-3">
      <div className="flex flex-wrap gap-2">
        <FilterChip active={banner === "all"} onClick={() => onBanner("all")}>
          All Banners
        </FilterChip>
        {banners.map((b) => (
          <FilterChip key={b} active={banner === b} onClick={() => onBanner(b)}>
            {b}
          </FilterChip>
        ))}
      </div>
      <div className="ml-auto min-w-56 flex-1 space-y-1.5">
        <Label htmlFor="proj-search" className="text-[10px] uppercase tracking-wider">
          Filter by movie / quote
        </Label>
        <Input
          id="proj-search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Movie title or SCP-Q-…"
        />
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function QuoteCard({
  quote,
  onPay,
  onView,
}: {
  quote: QuoteRequest;
  onPay: () => void;
  onView: (kind: QuoteDocKind) => void;
}) {
  const priced = quote.status !== "quote_requested";
  const days = quote.actual_days_used ?? quote.estimated_days;
  return (
    <article className="rounded-xl border border-primary/20 bg-card p-4 sm:p-5">
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
            {quote.shoot_location || "Location TBC"} · {quote.shoot_start_date} →{" "}
            {quote.actual_return_date ?? quote.estimated_return_date} · {days} day
            {days > 1 ? "s" : ""}
          </p>
        </div>
        <StatusPill quote={quote} />
      </header>

      <ul className="mt-4 divide-y divide-border/60 text-sm">
        {quote.items.map((item) => (
          <li key={item.prop_id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
            <span>
              <span className="font-semibold">{item.prop_name}</span>
              {item.prop_specs && (
                <span className="text-muted-foreground"> ({item.prop_specs})</span>
              )}
              <span className="ml-2 text-xs text-muted-foreground">× {item.quantity}</span>
            </span>
            {priced && (
              <span className="text-right">
                <span className="text-xs text-muted-foreground">{inr(item.daily_rate)}/day · </span>
                <span className="font-semibold text-primary">{inr(item.line_total)}</span>
              </span>
            )}
          </li>
        ))}
      </ul>

      {priced && (
        <div className="mt-4 grid gap-3 rounded-lg border border-border bg-secondary/40 p-3 text-sm sm:grid-cols-4">
          <Stat label="Rental Total" value={inr(quote.status === "settled" ? quote.final_total : quote.estimated_total)} />
          <Stat label="Security Deposit" value={inr(quote.security_deposit)} />
          <Stat
            label={quote.advance_paid > 0 ? "Advance Paid" : "Advance Required"}
            value={inr(quote.advance_paid > 0 ? quote.advance_paid : quote.advance_required)}
          />
          <Stat label="Balance Due" value={inr(quote.balance_due)} highlight />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {quote.status === "quote_sent" && (
          <Button onClick={onPay}>
            <Wallet className="size-4" /> Accept Quote &amp; Pay Advance
          </Button>
        )}
        {priced && (
          <Button variant="outline" onClick={() => onView("quotation")}>
            <FileText className="size-4" /> View Quotation
          </Button>
        )}
        {quote.status === "settled" && (
          <Button variant="outline" onClick={() => onView("settlement")}>
            <Receipt className="size-4" /> Final Settlement Invoice
          </Button>
        )}
      </div>
    </article>
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

function AdvanceDialog({
  quote,
  onOpenChange,
}: {
  quote: QuoteRequest | null;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [reference, setReference] = useState("");
  const [proofPath, setProofPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const accept = useMutation({
    mutationFn: () =>
      portal.acceptQuote({
        id: quote!.id,
        payment_reference: reference,
        payment_proof_path: proofPath,
      }),
    onSuccess: () => {
      toast.success("Advance submitted for verification");
      void qc.invalidateQueries({ queryKey: portalKeys.myQuotes });
      void qc.invalidateQueries({ queryKey: portalKeys.myPayments });
      setReference("");
      setProofPath(null);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Could not submit the advance", { description: e.message }),
  });

  return (
    <Dialog open={quote !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-primary/25 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide text-gradient-gold">
            Accept Quote &amp; Pay Advance
          </DialogTitle>
          <DialogDescription>
            Pay the advance by UPI, then enter the transaction reference and attach a screenshot. Our
            desk verifies it and locks your props.
          </DialogDescription>
        </DialogHeader>

        {quote && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-lg border border-primary/25 bg-secondary/40 p-3 sm:grid-cols-3">
              <Stat label="Advance Required" value={inr(quote.advance_required)} highlight />
              <Stat label="Security Deposit" value={inr(quote.security_deposit)} />
              <Stat label="Estimated Total" value={inr(quote.estimated_total)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref">UPI / Transaction Reference</Label>
              <Input
                id="ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={120}
                placeholder="UPI Ref 4238xxxxxx"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proof">Payment Proof (optional)</Label>
              <Input
                id="proof"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    const res = await portal.uploadProof(file);
                    setProofPath(res.path);
                    toast.success("Payment proof attached");
                  } catch (err) {
                    toast.error("Upload failed", { description: (err as Error).message });
                  } finally {
                    setUploading(false);
                  }
                }}
              />
              {proofPath && (
                <p className="flex items-center gap-1 text-[11px] text-primary">
                  <Upload className="size-3" /> Proof attached
                </p>
              )}
            </div>
            <Button
              className="w-full"
              disabled={reference.trim() === "" || accept.isPending || uploading}
              onClick={() => accept.mutate()}
            >
              {accept.isPending ? "Submitting…" : "Submit Advance for Verification"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProfileForm() {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: portalKeys.profile, queryFn: portal.getProfile });
  const [form, setForm] = useState<Partial<ClientProfile>>({});

  useEffect(() => {
    if (profile.data) setForm(profile.data);
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () => portal.saveProfile(form),
    onSuccess: () => {
      toast.success("Profile updated");
      void qc.invalidateQueries({ queryKey: portalKeys.profile });
    },
    onError: (e: Error) => toast.error("Could not save the profile", { description: e.message }),
  });

  if (profile.isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <form
      className="grid gap-4 rounded-xl border border-primary/20 bg-card p-5 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="p-house">Production House</Label>
        <Input
          id="p-house"
          value={form.production_house ?? ""}
          onChange={(e) => setForm({ ...form, production_house: e.target.value })}
          maxLength={160}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-contact">Contact Person</Label>
        <Input
          id="p-contact"
          value={form.contact_person ?? ""}
          onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
          maxLength={120}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-desig">Designation</Label>
        <Input
          id="p-desig"
          value={form.designation ?? ""}
          onChange={(e) => setForm({ ...form, designation: e.target.value })}
          maxLength={120}
          placeholder="Art Director / Line Producer"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-phone">Phone</Label>
        <Input
          id="p-phone"
          value={form.phone ?? ""}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          maxLength={24}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-email">Email</Label>
        <Input id="p-email" value={form.email ?? ""} readOnly disabled />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="p-address">Saved Address</Label>
        <Textarea
          id="p-address"
          rows={3}
          maxLength={400}
          value={form.address ?? ""}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </div>
      <Button type="submit" className="sm:col-span-2" disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save Profile"}
      </Button>
    </form>
  );
}
