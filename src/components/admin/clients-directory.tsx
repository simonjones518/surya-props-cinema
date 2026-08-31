import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { portal, portalKeys, QUOTE_LABEL, QUOTE_TONE } from "@/lib/portal-api";
import { inr, prettyDate } from "@/lib/format";
import type { ClientAccountSummary } from "@/lib/types";

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-display text-xl tracking-wide ${tone ?? "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

export function ClientsDirectory() {
  const [term, setTerm] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const accounts = useQuery({
    queryKey: portalKeys.clientAccounts,
    queryFn: portal.getClientAccounts,
  });

  const list = useMemo(() => {
    const q = term.trim().toLowerCase();
    const rows = accounts.data ?? [];
    if (!q) return rows;
    return rows.filter((c) =>
      [c.contact_person, c.email, c.phone, c.production_house, ...c.production_houses, ...c.movies]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [accounts.data, term]);

  if (openId) return <ClientDossierView userId={openId} onBack={() => setOpenId(null)} />;

  return (
    <section className="mt-6 print:hidden" aria-label="Client profiles">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search client, phone, banner or movie…"
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {list.length} registered client{list.length === 1 ? "" : "s"}
        </p>
      </div>

      {accounts.isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {!accounts.isLoading && list.length === 0 && (
        <p className="rounded-xl border border-primary/20 bg-card p-8 text-center text-muted-foreground">
          No client accounts registered yet.
        </p>
      )}

      {/* mobile cards */}
      <div className="grid gap-3 lg:hidden">
        {list.map((c) => (
          <button
            key={c.user_id}
            type="button"
            onClick={() => setOpenId(c.user_id)}
            className="rounded-xl border border-primary/20 bg-card p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary">
                <UserRound className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{c.contact_person}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.designation || "Client"} · {c.phone || c.email}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Quotes</p>
                <p className="font-semibold">{c.quotes_total}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Received
                </p>
                <p className="font-semibold text-success">{inr(c.received_total)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Due</p>
                <p className="font-semibold text-amber-neon">{inr(c.outstanding_total)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* desktop table */}
      {list.length > 0 && (
        <div className="hidden overflow-x-auto rounded-xl border border-primary/20 bg-card lg:block">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Production Houses</th>
                <th className="px-4 py-3">Quotes</th>
                <th className="px-4 py-3">Approved Value</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Outstanding</th>
                <th className="px-4 py-3">Last Activity</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr
                  key={c.user_id}
                  className="border-b border-border/60 last:border-0 hover:bg-secondary/40"
                >
                  <td className="px-4 py-3 font-semibold">
                    {c.contact_person}
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      {c.designation || "Client"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {c.phone}
                    <span className="block text-muted-foreground">{c.email}</span>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-xs text-muted-foreground">
                    {c.production_houses.join(", ") || c.production_house || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {c.quotes_total} total
                    <span className="block text-muted-foreground">
                      {c.quotes_active} active · {c.quotes_closed} closed
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">
                    {inr(c.approved_value)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-success">
                    {inr(c.received_total)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 ${
                      c.outstanding_total > 0 ? "text-amber-neon" : "text-success"
                    }`}
                  >
                    {inr(c.outstanding_total)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    {c.last_activity_at ? prettyDate(c.last_activity_at) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => setOpenId(c.user_id)}>
                      View Profile
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ClientDossierView({ userId, onBack }: { userId: string; onBack: () => void }) {
  const dossier = useQuery({
    queryKey: portalKeys.clientDossier(userId),
    queryFn: () => portal.getClientDossier(userId),
  });

  const p: ClientAccountSummary | undefined = dossier.data?.profile;

  return (
    <section className="mt-6 space-y-5 print:hidden" aria-label="Client profile history">
      <Button size="sm" variant="outline" onClick={onBack}>
        <ArrowLeft className="size-4" /> All Clients
      </Button>

      {dossier.isLoading && <Skeleton className="h-72 w-full rounded-xl" />}

      {p && (
        <>
          <div className="rounded-xl border border-primary/25 bg-card p-5">
            <h2 className="font-display text-2xl tracking-wide text-gradient-gold">
              {p.contact_person}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.designation || "Client"} · {p.phone || "no phone"} · {p.email}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Banners: {p.production_houses.join(", ") || p.production_house || "—"}
            </p>
            {p.movies.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">Projects: {p.movies.join(", ")}</p>
            )}
            {p.address && <p className="mt-1 text-xs text-muted-foreground">{p.address}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Total Quotes" value={String(p.quotes_total)} />
            <Stat label="Approved Value" value={inr(p.approved_value)} />
            <Stat label="Received Till Date" value={inr(p.received_total)} tone="text-success" />
            <Stat
              label="Outstanding"
              value={inr(p.outstanding_total)}
              tone={p.outstanding_total > 0 ? "text-amber-neon" : "text-success"}
            />
            <Stat label="Deposits Held" value={inr(p.deposits_held)} />
          </div>

          {/* service history */}
          <div className="rounded-xl border border-primary/20 bg-card">
            <h3 className="border-b border-border px-4 py-3 text-[11px] font-bold uppercase tracking-[0.28em] text-primary">
              Service & Quotation History
            </h3>
            <div className="divide-y divide-border/60">
              {(dossier.data?.quotes ?? []).map((q) => (
                <div key={q.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-primary">{q.quote_code}</p>
                      <p className="font-semibold">
                        {q.movie_name || "Untitled project"}
                        <span className="text-xs font-normal text-muted-foreground">
                          {" "}
                          · {q.production_house}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${QUOTE_TONE[q.status]}`}
                    >
                      {QUOTE_LABEL[q.status]}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <p className="text-muted-foreground">
                      Shoot: {prettyDate(q.shoot_start_date)} →{" "}
                      {prettyDate(q.actual_return_date ?? q.estimated_return_date)}
                    </p>
                    <p>
                      Value:{" "}
                      <span className="font-semibold">
                        {inr(q.final_total > 0 ? q.final_total : q.estimated_total)}
                      </span>
                    </p>
                    <p>
                      Advance paid: <span className="text-success">{inr(q.advance_paid)}</span>
                    </p>
                    <p>
                      Balance:{" "}
                      <span className={q.balance_due > 0 ? "text-amber-neon" : "text-success"}>
                        {inr(q.balance_due)}
                      </span>
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {q.items.length} item(s) · requested {prettyDate(q.created_at)}
                  </p>
                </div>
              ))}
              {(dossier.data?.quotes ?? []).length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No quotes raised by this client yet.
                </p>
              )}
            </div>
          </div>

          {/* invoices */}
          <div className="rounded-xl border border-primary/20 bg-card">
            <h3 className="border-b border-border px-4 py-3 text-[11px] font-bold uppercase tracking-[0.28em] text-primary">
              Invoices & Quotation Documents
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Received</th>
                    <th className="px-4 py-3">Balance</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(dossier.data?.invoices ?? []).map((i) => (
                    <tr key={i.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-mono text-xs text-primary">
                        {i.invoice_number}
                      </td>
                      <td className="px-4 py-3 text-xs">{i.doc_type}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {prettyDate(i.shoot_start_date)} → {prettyDate(i.shoot_wrap_date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold">
                        {inr(i.subtotal - i.discount + i.transport_charges + i.gst_amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-success">
                        {inr(i.advance_received)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 ${
                          i.balance_payable > 0 ? "text-amber-neon" : "text-success"
                        }`}
                      >
                        {inr(i.balance_payable)}
                      </td>
                      <td className="px-4 py-3 text-xs">{i.payment_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(dossier.data?.invoices ?? []).length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No invoices raised for this client yet.
                </p>
              )}
            </div>
          </div>

          {/* payment ledger */}
          <div className="rounded-xl border border-primary/20 bg-card">
            <h3 className="border-b border-border px-4 py-3 text-[11px] font-bold uppercase tracking-[0.28em] text-primary">
              Payments Received
            </h3>
            <div className="divide-y divide-border/60">
              {(dossier.data?.payments ?? []).map((pay) => (
                <div key={pay.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <div>
                    <p className="text-sm font-semibold capitalize">
                      {pay.kind.replace("_", " ")}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        Quote #{pay.quote_id} · {prettyDate(pay.created_at)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ref: {pay.reference || "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg tracking-wide">{inr(pay.amount)}</p>
                    <p
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        pay.status === "verified" ? "text-success" : "text-amber-neon"
                      }`}
                    >
                      {pay.status}
                    </p>
                  </div>
                </div>
              ))}
              {(dossier.data?.payments ?? []).length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No payments recorded yet.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
