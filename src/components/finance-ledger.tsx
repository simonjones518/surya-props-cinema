import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EXPENSE_LABEL, staffApi, staffKeys } from "@/lib/staff-api";
import type { ExpenseCategory } from "@/lib/staff-types";
import { inr, inrCompact, prettyDate } from "@/lib/format";

const CATEGORIES = Object.keys(EXPENSE_LABEL) as ExpenseCategory[];

export function FinanceLedger() {
  const qc = useQueryClient();
  const kpi = useQuery({ queryKey: staffKeys.kpi, queryFn: staffApi.kpi });
  const expenses = useQuery({ queryKey: staffKeys.expenses, queryFn: staffApi.expenses });
  const [form, setForm] = useState({
    category: "maintenance" as ExpenseCategory,
    amount: "",
    description: "",
    spent_on: new Date().toISOString().slice(0, 10),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: staffKeys.expenses });
    void qc.invalidateQueries({ queryKey: staffKeys.kpi });
  };

  const add = useMutation({
    mutationFn: () =>
      staffApi.addExpense({
        category: form.category,
        amount: Number(form.amount),
        description: form.description,
        spent_on: form.spent_on,
      }),
    onSuccess: () => {
      refresh();
      setForm({ ...form, amount: "", description: "" });
      toast.success("Expense recorded");
    },
    onError: (e: Error) => toast.error("Could not save expense", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => staffApi.deleteExpense(id),
    onSuccess: () => {
      refresh();
      toast.success("Expense removed");
    },
    onError: (e: Error) => toast.error("Delete failed", { description: e.message }),
  });

  const k = kpi.data;
  const peak = Math.max(1, ...(k?.monthly ?? []).map((m) => Math.max(m.revenue, m.expenses)));

  return (
    <section className="mt-6 space-y-6 print:hidden" aria-label="Financial control tower">
      {kpi.isLoading ? (
        <Skeleton className="h-28 w-full rounded-xl" />
      ) : kpi.isError ? (
        <p className="rounded-xl border border-primary/20 bg-card p-5 text-sm text-amber-neon">
          Financial tables are not created yet — run <code>db/surya-phase-2.sql</code>. (
          {(kpi.error as Error).message})
        </p>
      ) : (
        k && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Capital Invested", value: inrCompact(k.capital_invested) },
                { label: "Replacement Valuation", value: inrCompact(k.replacement_valuation) },
                { label: "Expected Inflow", value: inrCompact(k.expected_inflow) },
                { label: "Realized Revenue", value: inrCompact(k.realized_revenue) },
                { label: "Total Expenses", value: inrCompact(k.total_expenses) },
                { label: "Net Profit", value: inrCompact(k.net_profit), hero: true },
                { label: "Props In-House / On-Set", value: `${k.props_in_house} / ${k.props_on_set}` },
                { label: "Open Damage Reports", value: String(k.open_damage_reports) },
              ].map((m) => (
                <div
                  key={m.label}
                  className={`rounded-xl border p-4 ${
                    m.hero ? "border-primary/45 surface-metal glow-gold" : "border-primary/20 bg-card"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    {m.label}
                  </p>
                  <p className="mt-3 font-display text-3xl tracking-wide">{m.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-primary/20 bg-card p-5">
              <h3 className="font-display text-2xl tracking-wide">Revenue vs Expenses — last 6 months</h3>
              <div className="mt-5 flex items-end gap-4 overflow-x-auto">
                {k.monthly.map((m) => (
                  <div key={m.month} className="flex min-w-[70px] flex-1 flex-col items-center gap-2">
                    <div className="flex h-40 items-end gap-1">
                      <div
                        className="w-6 rounded-t bg-primary/80"
                        style={{ height: `${(m.revenue / peak) * 100}%` }}
                        title={`Revenue ${inr(m.revenue)}`}
                      />
                      <div
                        className="w-6 rounded-t bg-muted-foreground/50"
                        style={{ height: `${(m.expenses / peak) * 100}%` }}
                        title={`Expenses ${inr(m.expenses)}`}
                      />
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {m.month}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Gold = revenue · Grey = expenses
              </p>
            </div>
          </>
        )
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <form
          className="space-y-4 rounded-xl border border-primary/25 bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate();
          }}
        >
          <h3 className="font-display text-2xl tracking-wide">Record Expense</h3>
          <div className="grid gap-2">
            <Label htmlFor="ex-cat">Category</Label>
            <select
              id="ex-cat"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ex-amt">Amount (₹)</Label>
            <Input
              id="ex-amt"
              type="number"
              min="1"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ex-desc">Description</Label>
            <Input
              id="ex-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Lorry hire — Ramoji Film City"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ex-date">Date</Label>
            <Input
              id="ex-date"
              type="date"
              value={form.spent_on}
              onChange={(e) => setForm({ ...form, spent_on: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full" disabled={add.isPending}>
            <Wallet className="size-4" /> {add.isPending ? "Saving…" : "Add to Ledger"}
          </Button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-primary/20 bg-card">
          {expenses.isLoading ? (
            <div className="p-5">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : expenses.isError ? (
            <p className="p-5 text-sm text-amber-neon">Awaiting phase-2 tables.</p>
          ) : (expenses.data ?? []).length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">
              No expenses logged yet — maintenance, transport and labour costs feed net profit.
            </p>
          ) : (
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(expenses.data ?? []).map((x) => (
                  <tr key={x.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="whitespace-nowrap px-4 py-3 text-xs">{prettyDate(x.spent_on)}</td>
                    <td className="px-4 py-3 text-xs uppercase tracking-wider text-primary">
                      {EXPENSE_LABEL[x.category]}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{x.description}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">{inr(x.amount)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => remove.mutate(x.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
