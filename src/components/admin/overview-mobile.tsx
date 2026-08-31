import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { AlertTriangle, Plus, Receipt, ScanLine, Truck, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { inr, inrCompact, prettyDate } from "@/lib/format";
import type { KpiAnalytics, Prop, RentalOrder } from "@/lib/types";
import type { AdminSectionKey } from "@/components/admin/admin-nav";

export function OverviewMobile({
  kpi,
  loading,
  orders,
  props,
  onSelect,
  onNewOrder,
  onQuickQuote,
  onAddProp,
  onScan,
}: {
  kpi: KpiAnalytics | undefined;
  loading: boolean;
  orders: RentalOrder[];
  props: Prop[];
  onSelect: (key: AdminSectionKey) => void;
  onNewOrder: () => void;
  onQuickQuote: () => void;
  onAddProp: () => void;
  onScan: () => void;
}) {
  if (loading || !kpi) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  const tiles = [
    { label: "Active Shoots", value: String(kpi.active_rentals), tone: "text-foreground" },
    { label: "Overdue", value: String(kpi.overdue_rentals), tone: "text-amber-neon" },
    { label: "Advances", value: inrCompact(kpi.advances_collected), tone: "text-foreground" },
    { label: "Outstanding", value: inrCompact(kpi.outstanding_balances), tone: "text-amber-neon" },
    { label: "On-Set Value", value: inrCompact(kpi.on_set_inventory_value), tone: "text-foreground" },
    { label: "Warehouse", value: inrCompact(kpi.warehouse_valuation), tone: "text-foreground" },
  ];

  const actions = [
    { label: "New Challan", icon: Truck, run: onNewOrder },
    { label: "Quick Quote", icon: Receipt, run: onQuickQuote },
    { label: "Add Prop", icon: Plus, run: onAddProp },
    { label: "Scan Return", icon: ScanLine, run: onScan },
  ];

  return (
    <div className="space-y-4">
      <div className="surface-metal glow-gold rounded-2xl border border-primary/45 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
          Gross Revenue Today
        </p>
        <p className="mt-1 font-display text-4xl tracking-wide text-foreground">
          {inr(kpi.gross_revenue_today)}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-primary">
          <Wallet className="size-3.5" /> Net profit {inr(kpi.net_profit_today)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-primary/20 bg-card p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {t.label}
            </p>
            <p className={`mt-1.5 font-display text-2xl tracking-wide ${t.tone}`}>{t.value}</p>
          </div>
        ))}
      </div>

      {kpi.overdue_rentals > 0 && (
        <button
          type="button"
          onClick={() => onSelect("orders")}
          className="flex w-full items-center gap-3 rounded-2xl border border-amber-neon/40 bg-amber-neon/10 p-3 text-left"
        >
          <AlertTriangle className="size-5 text-amber-neon" />
          <span className="text-sm font-semibold text-foreground">
            {kpi.overdue_rentals} rental(s) overdue — review settlements
          </span>
        </button>
      )}

      <section aria-label="Quick actions">
        <p className="pb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.run}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left text-sm font-semibold text-foreground"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-primary/12 text-primary">
                <a.icon className="size-4" />
              </span>
              {a.label}
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Revenue trend" className="rounded-2xl border border-primary/20 bg-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
          Revenue Trend
        </p>
        <div className="mt-3 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={kpi.revenue_trend}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.16 0 0)",
                  border: "1px solid oklch(0.3 0 0)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                formatter={(v: number) => inr(v)}
              />
              <Bar dataKey="revenue" name="Revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section aria-label="Recent orders" className="rounded-2xl border border-primary/20 bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            Recent Orders
          </p>
          <button type="button" onClick={() => onSelect("orders")} className="text-xs font-semibold text-primary">
            View all
          </button>
        </div>
        <ul className="divide-y divide-border/60">
          {orders.slice(0, 4).map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {o.production_house || o.client_name}
                </p>
                <p className="font-mono text-[10px] text-primary">
                  {o.order_number} · {prettyDate(o.dispatch_date)}
                </p>
              </div>
              <p className="whitespace-nowrap text-sm font-semibold">
                {inrCompact(o.actual_days_used ? o.total_final_amount : o.estimated_total)}
              </p>
            </li>
          ))}
          {orders.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">No rental orders yet.</li>
          )}
        </ul>
      </section>

      <p className="pb-2 text-center text-[11px] text-muted-foreground">
        {props.length} props tracked · tap “More” for staff, field ops and finance
      </p>
    </div>
  );
}
