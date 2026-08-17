import { useState } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Boxes,
  IndianRupee,
  PackageCheck,
  Plus,
  TrendingUp,
  Truck,
  Vault,
  Wallet,
  LogOut,
} from "lucide-react";
import { api, queryKeys } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DepositBadge, RentalStatusBadge } from "@/components/status-badge";
import { StockModal } from "@/components/stock-modal";
import { inr, inrCompact, prettyDate } from "@/lib/format";
import type { RentalBooking, RentalStatus } from "@/lib/types";
import { adminLogout, requireAdmin } from "@/lib/admin-gate.functions";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { unlocked } = await requireAdmin();
    if (!unlocked) throw redirect({ to: "/admin-login" });
  },
  head: () => ({
    meta: [
      { title: "Rental ERP Dashboard — Surya Cine Special Props" },
      {
        name: "description",
        content:
          "Live prop rental ERP: today's gross revenue and net profit in ₹, active rentals, warehouse valuation, deposits held and the full rental pipeline.",
      },
      { property: "og:title", content: "Rental ERP Dashboard — Surya Cine Special Props" },
      {
        property: "og:description",
        content: "Track revenue, on-set inventory, outstanding balances and booking status transitions in real time.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const logout = useServerFn(adminLogout);
  const [stockOpen, setStockOpen] = useState(false);
  const kpi = useQuery({ queryKey: queryKeys.kpi, queryFn: api.getKpi });
  const bookings = useQuery({ queryKey: queryKeys.bookings, queryFn: api.getBookings });
  const categories = useQuery({ queryKey: queryKeys.categories, queryFn: api.getCategories });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: RentalStatus }) =>
      api.updateBookingStatus(id, status),
    onSuccess: (_res, vars) => {
      qc.setQueryData<RentalBooking[]>(queryKeys.bookings, (old) =>
        (old ?? []).map((b) => (b.id === vars.id ? { ...b, rental_status: vars.status } : b)),
      );
      toast.success(`Booking moved to ${vars.status}`);
    },
    onError: (e: Error) => toast.error("Status update failed", { description: e.message }),
  });

  const refundMutation = useMutation({
    mutationFn: (id: number) => api.refundDeposit(id),
    onSuccess: (_res, id) => {
      qc.setQueryData<RentalBooking[]>(queryKeys.bookings, (old) =>
        (old ?? []).map((b) => (b.id === id ? { ...b, deposit_status: "Refunded" } : b)),
      );
      toast.success("Security deposit refunded");
    },
    onError: (e: Error) => toast.error("Refund failed", { description: e.message }),
  });

  const k = kpi.data;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.38em] text-primary">Admin ERP</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">
            <span className="text-gradient-gold">Rental Command Center</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setStockOpen(true)}>
            <Plus className="size-4" /> Add Prop to Stock
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await logout();
              qc.clear();
              await router.navigate({ to: "/admin-login", replace: true });
            }}
          >
            <LogOut className="size-4" /> Sign Out
          </Button>
        </div>
      </div>

      <section aria-label="Key metrics" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpi.isLoading || !k
          ? [0, 1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : [
              { label: "Gross Revenue Today", value: inr(k.gross_revenue_today), icon: IndianRupee, hero: true },
              { label: "Net Profit Today", value: inr(k.net_profit_today), icon: TrendingUp, hero: true },
              { label: "Active Rentals", value: String(k.active_rentals), icon: Truck },
              { label: "On-Set Inventory Value", value: inrCompact(k.on_set_inventory_value), icon: Boxes },
              { label: "Warehouse Valuation", value: inrCompact(k.warehouse_valuation), icon: Vault },
              { label: "Outstanding Balances", value: inr(k.outstanding_balances), icon: Wallet },
              { label: "Held Security Deposits", value: inr(k.held_deposits), icon: PackageCheck },
            ].map((m) => (
              <div
                key={m.label}
                className={`rounded-xl border p-4 transition-colors ${
                  m.hero
                    ? "border-primary/45 surface-metal glow-gold"
                    : "border-primary/20 bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    {m.label}
                  </p>
                  <m.icon className="size-4 text-primary" />
                </div>
                <p className="mt-3 font-display text-3xl tracking-wide text-foreground">{m.value}</p>
              </div>
            ))}
      </section>

      <section className="mt-10" aria-label="Rental pipeline">
        <h2 className="text-2xl tracking-wide text-foreground sm:text-3xl">Rental Pipeline</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-primary/20 bg-card">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <Th>Booking</Th>
                <Th>Production House</Th>
                <Th>Assigned Props</Th>
                <Th>Shoot Dates</Th>
                <Th>Advance</Th>
                <Th>Balance</Th>
                <Th>Status</Th>
                <Th>Deposit</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {(bookings.data ?? []).map((b) => (
                <tr key={b.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                  <Td className="font-mono text-xs text-primary">{b.booking_code}</Td>
                  <Td className="font-semibold">{b.production_house}</Td>
                  <Td className="max-w-[220px] text-xs text-muted-foreground">
                    {b.items.map((i) => `${i.prop_title} ×${i.quantity}`).join(", ")}
                  </Td>
                  <Td className="whitespace-nowrap text-xs">
                    {prettyDate(b.start_date)} → {prettyDate(b.wrap_date)}
                  </Td>
                  <Td className="whitespace-nowrap">{inr(b.advance_paid)}</Td>
                  <Td className={`whitespace-nowrap ${b.balance_due > 0 ? "text-amber-neon" : "text-success"}`}>
                    {inr(b.balance_due)}
                  </Td>
                  <Td>
                    <RentalStatusBadge status={b.rental_status} />
                  </Td>
                  <Td>
                    <DepositBadge status={b.deposit_status} />
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={b.rental_status === "On-Set" || statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: b.id, status: "On-Set" })}
                      >
                        Mark On-Set
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={b.rental_status === "Returned" || statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: b.id, status: "Returned" })}
                      >
                        Confirm Return &amp; Inspect
                      </Button>
                      <Button
                        size="sm"
                        disabled={b.deposit_status === "Refunded" || refundMutation.isPending}
                        onClick={() => refundMutation.mutate(b.id)}
                      >
                        Refund Deposit
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {bookings.isLoading && <div className="p-6"><Skeleton className="h-40 w-full" /></div>}
        </div>
      </section>

      <StockModal open={stockOpen} onOpenChange={setStockOpen} categories={categories.data ?? []} />
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-bold">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}