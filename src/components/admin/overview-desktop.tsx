import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BadgeIndianRupee,
  Boxes,
  CalendarDays,
  CalendarRange,
  HandCoins,
  IndianRupee,
  PackageCheck,
  PiggyBank,
  TrendingUp,
  Truck,
  Vault,
  Wallet,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { inr, inrCompact, prettyDate } from "@/lib/format";
import type { Invoice, KpiAnalytics, Prop, RentalOrder } from "@/lib/types";

export function OverviewDesktop({
  kpi,
  loading,
  orders,
  invoices,
  props,
}: {
  kpi: KpiAnalytics | undefined;
  loading: boolean;
  orders: RentalOrder[];
  invoices: Invoice[];
  props: Prop[];
}) {
  if (loading || !kpi) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
        <Skeleton className="h-72 rounded-xl sm:col-span-2 xl:col-span-4" />
      </div>
    );
  }

  const hero = [
    { label: "Gross Revenue Today", value: inr(kpi.gross_revenue_today), icon: IndianRupee },
    { label: "Net Profit Today", value: inr(kpi.net_profit_today), icon: TrendingUp },
  ];
  const period = [
    { label: "Revenue This Month", value: inr(kpi.monthly_revenue), icon: CalendarDays },
    { label: "Revenue This Year", value: inr(kpi.yearly_revenue), icon: CalendarRange },
    { label: "Received This Month", value: inr(kpi.monthly_received), icon: BadgeIndianRupee },
    { label: "Received This Year", value: inr(kpi.yearly_received), icon: PiggyBank },
  ];
  const stats = [
    { label: "Active Shoots", value: String(kpi.active_rentals), icon: Truck },
    { label: "Overdue Rentals", value: String(kpi.overdue_rentals), icon: AlertTriangle },
    { label: "On-Set Inventory", value: inrCompact(kpi.on_set_inventory_value), icon: Boxes },
    { label: "Warehouse Valuation", value: inrCompact(kpi.warehouse_valuation), icon: Vault },
    { label: "Advances Collected", value: inr(kpi.advances_collected), icon: HandCoins },
    { label: "Outstanding Balances", value: inr(kpi.outstanding_balances), icon: Wallet },
    { label: "Held Deposits", value: inr(kpi.held_deposits), icon: PackageCheck },
  ];

  const onSet = props.filter((p) => p.status === "On-Set").length;
  const maintenance = props.filter((p) => p.status === "Maintenance").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {hero.map((m) => (
          <div key={m.label} className="surface-metal glow-gold rounded-xl border border-primary/45 p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                {m.label}
              </p>
              <m.icon className="size-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-4xl tracking-wide text-foreground">{m.value}</p>
          </div>
        ))}
        {stats.slice(0, 2).map((m) => (
          <StatCard key={m.label} {...m} />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {period.map((m) => (
          <StatCard key={m.label} {...m} />
        ))}
      </div>



      <div className="grid items-start gap-6 xl:grid-cols-3">
        <section
          aria-label="Revenue trend"
          className="rounded-xl border border-primary/20 bg-card p-5 xl:col-span-2"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl tracking-wide text-gradient-gold">Revenue & Profit Trend</h2>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Recent periods</p>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpi.revenue_trend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1, 0 0% 0%))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.16 0 0)",
                    border: "1px solid oklch(0.3 0 0)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => inr(v)}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Profit"
                  stroke="var(--amber-neon, #FF9900)"
                  fill="var(--amber-neon, #FF9900)"
                  fillOpacity={0.08}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {stats.slice(2).map((m) => (
            <StatCard key={m.label} {...m} />
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section aria-label="Latest rental orders" className="rounded-xl border border-primary/20 bg-card xl:col-span-2">
          <h2 className="border-b border-border px-5 py-4 font-display text-xl tracking-wide text-foreground">
            Latest Rental Orders
          </h2>
          <ul className="divide-y divide-border/60">
            {orders.slice(0, 6).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {o.production_house || o.client_name}
                  </p>
                  <p className="font-mono text-[11px] text-primary">
                    {o.order_number} · {prettyDate(o.dispatch_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{inr(o.actual_days_used ? o.total_final_amount : o.estimated_total)}</p>
                  <p className="text-[11px] text-muted-foreground">{o.order_status}</p>
                </div>
              </li>
            ))}
            {orders.length === 0 && (
              <li className="px-5 py-6 text-center text-sm text-muted-foreground">No rental orders yet.</li>
            )}
          </ul>
        </section>

        <section aria-label="Inventory health" className="rounded-xl border border-primary/20 bg-card p-5">
          <h2 className="font-display text-xl tracking-wide text-foreground">Inventory Health</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Total props" value={String(props.length)} />
            <Row label="On set now" value={String(onSet)} />
            <Row label="In maintenance" value={String(maintenance)} />
            <Row label="Documents raised" value={String(invoices.length)} />
          </dl>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Truck;
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-card p-4 transition-colors hover:border-primary/50">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-3 font-display text-3xl tracking-wide text-foreground">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-display text-lg tracking-wide text-foreground">{value}</dd>
    </div>
  );
}
