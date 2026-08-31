import { useState } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Receipt, ScanLine, Truck } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import {
  AdminMobileHeader,
  AdminMobileMenu,
  AdminMobileTabBar,
} from "@/components/admin/admin-mobile-nav";
import { OverviewDesktop } from "@/components/admin/overview-desktop";
import { OverviewMobile } from "@/components/admin/overview-mobile";
import { sectionOf, type AdminSectionKey } from "@/components/admin/admin-nav";

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
import { DirectInvoiceModal } from "@/components/direct-invoice-modal";
import { InventoryTable } from "@/components/inventory-table";
import { RequestsTable } from "@/components/requests-table";
import { InvoiceDocument } from "@/components/invoice-document";
import { RentalOrderModal } from "@/components/rental-order-modal";
import { RentalOrderDocument } from "@/components/rental-order-document";
import { GodownMatrix } from "@/components/godown-matrix";
import { QuoteApprovals } from "@/components/quote-approvals";
import { StaffManager } from "@/components/staff-manager";
import { FieldOpsLog } from "@/components/field-ops-log";
import { FinanceLedger } from "@/components/finance-ledger";

import { inr, inrCompact, prettyDate } from "@/lib/format";
import type { Invoice, Prop, RentalBooking, RentalOrder, RentalStatus } from "@/lib/types";
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
  const [directOpen, setDirectOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const [viewDoc, setViewDoc] = useState<Invoice | null>(null);
  const [viewOrder, setViewOrder] = useState<RentalOrder | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [settleId, setSettleId] = useState<number | null>(null);
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tab, setTab] = useState<AdminSectionKey>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();


  const kpi = useQuery({ queryKey: queryKeys.kpi, queryFn: api.getKpi });
  const bookings = useQuery({ queryKey: queryKeys.bookings, queryFn: api.getBookings });
  const categories = useQuery({ queryKey: queryKeys.categories, queryFn: api.getCategories });
  const props = useQuery({ queryKey: queryKeys.props, queryFn: api.getProps });
  const clients = useQuery({ queryKey: queryKeys.clients, queryFn: api.getClients });
  const invoices = useQuery({ queryKey: queryKeys.invoices, queryFn: api.getInvoices });
  const orders = useQuery({ queryKey: queryKeys.orders, queryFn: api.getRentalOrders });

  const settleMutation = useMutation({
    mutationFn: ({ id, date }: { id: number; date: string }) => api.settleRentalOrder(id, date),
    onSuccess: (order) => {
      void qc.invalidateQueries({ queryKey: queryKeys.orders });
      void qc.invalidateQueries({ queryKey: queryKeys.props });
      setSettleId(null);
      setViewOrder(order);
      toast.success(`${order.order_number} settled`, {
        description: `${order.actual_days_used} actual day(s) · balance ${inr(order.balance_payable)}`,
      });
    },
    onError: (e: Error) => toast.error("Settlement failed", { description: e.message }),
  });

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

  async function handleSignOut() {
    await logout();
    qc.clear();
    await router.navigate({ to: "/admin-login", replace: true });
  }

  const current = sectionOf(tab);

  return (
    <div className="flex min-h-screen bg-background print:block">
      <AdminSidebar
        active={tab}
        onSelect={setTab}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onSignOut={handleSignOut}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileHeader active={tab} onOpenMenu={() => setMenuOpen(true)} />

        <header className="hidden items-end justify-between gap-4 border-b border-border px-8 py-6 lg:flex print:hidden">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.38em] text-primary">Admin ERP</p>
            <h1 className="mt-1.5 font-display text-4xl tracking-wide">
              <span className="text-gradient-gold">{current.label}</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{current.hint}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" onClick={() => setOrderOpen(true)}>
              <Truck className="size-4" /> New Challan
            </Button>
            <Button size="sm" onClick={() => setCartOpen(true)}>
              <Receipt className="size-4" /> Quick Quotation
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStockOpen(true)}>
              <Plus className="size-4" /> Add Prop
            </Button>
            <Button size="sm" variant="outline" onClick={() => setScanOpen(true)}>
              <ScanLine className="size-4" /> Scan Return
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-4 lg:px-8 lg:pb-14 lg:pt-6 print:p-0">
          <div className="lg:hidden print:hidden">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Admin ERP</p>
            <h1 className="mt-1 font-display text-3xl tracking-wide text-gradient-gold">{current.label}</h1>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">{current.hint}</p>
          </div>

          {tab === "overview" &&
            (isMobile ? (
              <OverviewMobile
                kpi={k}
                loading={kpi.isLoading}
                orders={orders.data ?? []}
                props={props.data ?? []}
                onSelect={setTab}
                onNewOrder={() => setOrderOpen(true)}
                onQuickQuote={() => setCartOpen(true)}
                onAddProp={() => setStockOpen(true)}
                onScan={() => setScanOpen(true)}
              />
            ) : (
              <OverviewDesktop
                kpi={k}
                loading={kpi.isLoading}
                orders={orders.data ?? []}
                invoices={invoices.data ?? []}
                props={props.data ?? []}
              />
            ))}


      {tab === "quotes" && <QuoteApprovals />}

      {tab === "staff" && <StaffManager />}

      {tab === "field" && <FieldOpsLog />}

      {tab === "finance" && <FinanceLedger />}


      {tab === "orders" && (
        <section className="mt-6 print:hidden" aria-label="Rental orders and settlement">
          <div className="overflow-x-auto rounded-xl border border-primary/20 bg-card">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <Th>Order</Th>
                  <Th>Client</Th>
                  <Th>Dispatch</Th>
                  <Th>Days</Th>
                  <Th>Total</Th>
                  <Th>Advance</Th>
                  <Th>Balance</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {(orders.data ?? []).map((o) => (
                  <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <Td className="font-mono text-xs text-primary">{o.order_number}</Td>
                    <Td className="font-semibold">
                      {o.production_house || o.client_name}
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        {o.items.length} item(s) · {o.phone_number}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-xs">{prettyDate(o.dispatch_date)}</Td>
                    <Td className="text-xs">
                      {o.actual_days_used ?? o.estimated_days}
                      <span className="text-muted-foreground">
                        {o.actual_days_used ? " actual" : " est."}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap font-semibold">
                      {inr(o.actual_days_used ? o.total_final_amount : o.estimated_total)}
                    </Td>
                    <Td className="whitespace-nowrap">{inr(o.advance_received)}</Td>
                    <Td
                      className={`whitespace-nowrap ${o.balance_payable > 0 ? "text-amber-neon" : "text-success"}`}
                    >
                      {inr(o.balance_payable)}
                    </Td>
                    <Td className="text-xs">{o.order_status}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setViewOrder(o)}>
                          View / Print
                        </Button>
                        <Button
                          size="sm"
                          disabled={o.order_status !== "Estimated/On-Set"}
                          onClick={() => {
                            setSettleId(o.id);
                            setReturnDate(new Date().toISOString().slice(0, 10));
                          }}
                        >
                          Mark Returned
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.isLoading && <div className="p-6"><Skeleton className="h-32 w-full" /></div>}
            {!orders.isLoading && (orders.data ?? []).length === 0 && (
              <p className="p-6 text-center text-muted-foreground">
                No rental orders yet — create an estimated delivery challan when props leave the warehouse.
              </p>
            )}
          </div>
        </section>
      )}

      {tab === "warehouse" && (
        <section className="mt-6 print:hidden" aria-label="Warehouse stock matrix">
          <GodownMatrix props={props.data ?? []} />
        </section>
      )}

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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Props handed over by phone? Raise an invoice manually and WhatsApp it to the client.
            </p>
            <Button size="sm" onClick={() => setDirectOpen(true)}>
              <Receipt className="size-4" /> Raise Direct Invoice
            </Button>
          </div>
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
        </main>

        <AdminMobileTabBar active={tab} onSelect={setTab} onOpenMenu={() => setMenuOpen(true)} />
      </div>

      <AdminMobileMenu
        open={menuOpen}
        active={tab}
        onClose={() => setMenuOpen(false)}
        onSelect={setTab}
        onSignOut={handleSignOut}
      />

      <DirectInvoiceModal open={directOpen} onOpenChange={setDirectOpen} />

      <StockModal open={stockOpen} onOpenChange={setStockOpen} categories={categories.data ?? []} />
      <RentalOrderModal
        open={orderOpen}
        onOpenChange={setOrderOpen}
        props={props.data ?? []}
        onCreated={(order) => {
          setTab("orders");
          setViewOrder(order);
        }}
      />

      <Dialog open={settleId !== null} onOpenChange={(v) => !v && setSettleId(null)}>
        <DialogContent className="max-w-md border-primary/25 bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide text-gradient-gold">
              Actual Return &amp; Final Settlement
            </DialogTitle>
            <DialogDescription>
              Enter the real return date — the bill recalculates on actual days used.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Actual Return Date</Label>
            <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleId(null)}>
              Cancel
            </Button>
            <Button
              disabled={!returnDate || settleMutation.isPending}
              onClick={() =>
                settleId !== null && settleMutation.mutate({ id: settleId, date: returnDate })
              }
            >
              {settleMutation.isPending ? "Settling…" : "Recalculate & Settle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {viewOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 p-4 backdrop-blur-sm sm:p-8 print:static print:bg-white print:p-0">
          <RentalOrderDocument order={viewOrder} onClose={() => setViewOrder(null)} />
        </div>
      )}
    </div>

  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-bold">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}