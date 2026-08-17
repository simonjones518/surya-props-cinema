import { useState } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Boxes,
  HandCoins,
  IndianRupee,
  PackageCheck,
  Plus,
  Receipt,
  ScanLine,
  TrendingUp,
  Truck,
  Vault,
  Wallet,
  LogOut,
} from "lucide-react";
import { api, queryKeys } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DepositBadge, RentalStatusBadge } from "@/components/status-badge";
import { StockModal } from "@/components/stock-modal";
import { PosCart } from "@/components/pos-cart";
import { InventoryTable } from "@/components/inventory-table";
import { RequestsTable } from "@/components/requests-table";
import { InvoiceDocument } from "@/components/invoice-document";
import { inr, inrCompact, prettyDate } from "@/lib/format";
import type { Invoice, Prop, RentalBooking, RentalStatus } from "@/lib/types";
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
  const [cartOpen, setCartOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const [viewDoc, setViewDoc] = useState<Invoice | null>(null);
  const [tab, setTab] = useState<"pipeline" | "requests" | "inventory" | "billing">("pipeline");
  const kpi = useQuery({ queryKey: queryKeys.kpi, queryFn: api.getKpi });
  const bookings = useQuery({ queryKey: queryKeys.bookings, queryFn: api.getBookings });
  const categories = useQuery({ queryKey: queryKeys.categories, queryFn: api.getCategories });
  const props = useQuery({ queryKey: queryKeys.props, queryFn: api.getProps });
  const clients = useQuery({ queryKey: queryKeys.clients, queryFn: api.getClients });
  const invoices = useQuery({ queryKey: queryKeys.invoices, queryFn: api.getInvoices });

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

  const propStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Prop["status"] }) => api.updatePropStatus(id, status),
    onSuccess: (_r, vars) => {
      qc.setQueryData<Prop[]>(queryKeys.props, (old) =>
        (old ?? []).map((p) => (p.id === vars.id ? { ...p, status: vars.status } : p)),
      );
    },
  });

  function handleScan() {
    const code = scanCode.trim().toLowerCase();
    const prop = (props.data ?? []).find(
      (p) => p.serial_number.toLowerCase() === code || p.qr_code_id.toLowerCase() === code,
    );
    if (!prop) {
      toast.error("No prop matches that serial / QR code");
      return;
    }
    propStatusMutation.mutate({ id: prop.id, status: "In-Stock" });
    const booking = (bookings.data ?? []).find(
      (b) => b.items.some((i) => i.prop_id === prop.id) && b.rental_status !== "Returned",
    );
    if (booking) statusMutation.mutate({ id: booking.id, status: "Returned" });
    toast.success(`${prop.title} checked in`, { description: `${prop.serial_number} · returned & inspected` });
    setScanCode("");
    setScanOpen(false);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.38em] text-primary">Admin ERP</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">
            <span className="text-gradient-gold">Rental Command Center</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setCartOpen(true)}>
            <Receipt className="size-4" /> Create New Rental / Quotation
          </Button>
          <Button variant="outline" onClick={() => setStockOpen(true)}>
            <Plus className="size-4" /> Add New Prop
          </Button>
          <Button variant="outline" onClick={() => setScanOpen(true)}>
            <ScanLine className="size-4" /> Scan Prop Return
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

      <section aria-label="Key metrics" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        {kpi.isLoading || !k
          ? [0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : [
              { label: "Gross Revenue Today", value: inr(k.gross_revenue_today), icon: IndianRupee, hero: true },
              { label: "Net Profit Today", value: inr(k.net_profit_today), icon: TrendingUp, hero: true },
              { label: "Active Shoots", value: String(k.active_rentals), icon: Truck },
              { label: "Overdue Rentals", value: String(k.overdue_rentals), icon: AlertTriangle },
              { label: "On-Set Inventory Value", value: inrCompact(k.on_set_inventory_value), icon: Boxes },
              { label: "Warehouse Valuation", value: inrCompact(k.warehouse_valuation), icon: Vault },
              { label: "Advances Collected", value: inr(k.advances_collected), icon: HandCoins },
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

      <nav aria-label="Dashboard sections" className="mt-10 flex flex-wrap gap-2 print:hidden">
        {([
          ["pipeline", "Rental Pipeline"],
          ["requests", "Customer Requests"],
          ["inventory", "Inventory & Stock"],
          ["billing", "Invoices & Quotations"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-current={tab === key}
            className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              tab === key
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/60 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "pipeline" && (
      <section className="mt-6 print:hidden" aria-label="Rental pipeline">
        <div className="overflow-x-auto rounded-xl border border-primary/20 bg-card">
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
      )}

      {tab === "requests" && (
        <section className="mt-6 print:hidden" aria-label="Customer prop requests">
          <RequestsTable />
        </section>
      )}

      {tab === "inventory" && (
        <section className="mt-6 print:hidden" aria-label="Inventory and stock">
          {props.isLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <InventoryTable props={props.data ?? []} categories={categories.data ?? []} />
          )}
        </section>
      )}

      {tab === "billing" && (
        <section className="mt-6 print:hidden" aria-label="Invoices and quotations">
          <div className="overflow-x-auto rounded-xl border border-primary/20 bg-card">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <Th>Document</Th>
                  <Th>Type</Th>
                  <Th>Client</Th>
                  <Th>Shoot Dates</Th>
                  <Th>Items</Th>
                  <Th>Balance Payable</Th>
                  <Th>Payment</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {(invoices.data ?? []).map((v) => (
                  <tr key={v.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <Td className="font-mono text-xs text-primary">{v.invoice_number}</Td>
                    <Td className="text-xs uppercase tracking-wider">{v.doc_type}</Td>
                    <Td className="font-semibold">{v.production_house || v.client_name}</Td>
                    <Td className="whitespace-nowrap text-xs">
                      {prettyDate(v.shoot_start_date)} → {prettyDate(v.shoot_wrap_date)}
                    </Td>
                    <Td className="text-xs text-muted-foreground">{v.items.length}</Td>
                    <Td className="whitespace-nowrap font-semibold">{inr(v.balance_payable)}</Td>
                    <Td className="text-xs">{v.payment_status}</Td>
                    <Td>
                      <Button size="sm" variant="outline" onClick={() => setViewDoc(v)}>
                        View / Print
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invoices.isLoading && <div className="p-6"><Skeleton className="h-32 w-full" /></div>}
            {!invoices.isLoading && (invoices.data ?? []).length === 0 && (
              <p className="p-6 text-center text-muted-foreground">No documents yet — create a rental or quotation.</p>
            )}
          </div>
        </section>
      )}

      <StockModal open={stockOpen} onOpenChange={setStockOpen} categories={categories.data ?? []} />
      <PosCart
        open={cartOpen}
        onOpenChange={setCartOpen}
        props={props.data ?? []}
        clients={clients.data ?? []}
        onCreated={(inv) => {
          setTab("billing");
          setViewDoc(inv);
        }}
      />

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="max-w-md border-primary/25 bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide text-gradient-gold">
              Scan Prop Return
            </DialogTitle>
            <DialogDescription>Scan or type the prop serial / QR code to check it back in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Serial / QR Code</Label>
            <Input
              autoFocus
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
              placeholder="SCP-CAM-0007"
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!scanCode.trim()} onClick={handleScan}>
              Check In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {viewDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 p-4 backdrop-blur-sm sm:p-8 print:static print:bg-white print:p-0">
          <InvoiceDocument invoice={viewDoc} onClose={() => setViewDoc(null)} />
        </div>
      )}
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-bold">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}