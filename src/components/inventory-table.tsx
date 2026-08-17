import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConditionBadge, StockBadge } from "@/components/status-badge";
import { api, queryKeys } from "@/lib/api";
import { inr } from "@/lib/format";
import type { Category, Prop, PropStatus } from "@/lib/types";

export function InventoryTable({ props, categories }: { props: Prop[]; categories: Category[] }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<"all" | PropStatus>("all");

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: number; next: PropStatus }) => api.updatePropStatus(id, next),
    onSuccess: (_r, vars) => {
      qc.setQueryData<Prop[]>(queryKeys.props, (old) =>
        (old ?? []).map((p) => (p.id === vars.id ? { ...p, status: vars.next } : p)),
      );
      toast.success(`Prop marked ${vars.next}`);
    },
    onError: (e: Error) => toast.error("Status update failed", { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteProp(id),
    onSuccess: (_r, id) => {
      qc.setQueryData<Prop[]>(queryKeys.props, (old) => (old ?? []).filter((p) => p.id !== id));
      toast.success("Prop removed from inventory");
    },
    onError: (e: Error) => toast.error("Delete failed", { description: e.message }),
  });

  const rows = useMemo(
    () =>
      props.filter(
        (p) =>
          (category === "all" || p.category_slug === category) &&
          (status === "all" || p.status === status) &&
          (search.trim() === "" ||
            `${p.title} ${p.serial_number}`.toLowerCase().includes(search.toLowerCase())),
      ),
    [props, category, status, search],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or serial"
            aria-label="Search inventory"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip key={c.slug} active={category === c.slug} onClick={() => setCategory(c.slug)}>
              {c.name}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "In-Stock", "On-Set", "Booked", "Maintenance"] as const).map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s === "all" ? "Any status" : s}
            </Chip>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-primary/20 bg-card">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <th className="px-4 py-3">Serial</th>
              <th className="px-4 py-3">Prop</th>
              <th className="px-4 py-3">Daily Rate</th>
              <th className="px-4 py-3">Replacement</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Quick Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                <td className="px-4 py-3 font-mono text-xs text-primary">{p.serial_number}</td>
                <td className="px-4 py-3 font-semibold">{p.title}</td>
                <td className="px-4 py-3 whitespace-nowrap">{inr(p.daily_rate)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{inr(p.replacement_value)}</td>
                <td className="px-4 py-3">
                  <ConditionBadge condition={p.condition_rating} />
                </td>
                <td className="px-4 py-3">
                  <StockBadge status={p.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={p.status === "On-Set"}
                      onClick={() => statusMutation.mutate({ id: p.id, next: "On-Set" })}
                    >
                      Mark On-Set
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={p.status === "In-Stock"}
                      onClick={() => statusMutation.mutate({ id: p.id, next: "In-Stock" })}
                    >
                      Returned &amp; Inspected
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={p.status === "Maintenance"}
                      onClick={() => statusMutation.mutate({ id: p.id, next: "Maintenance" })}
                    >
                      Mark Damaged
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Delete ${p.title}`}
                      onClick={() => deleteMutation.mutate(p.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-muted-foreground">No props match these filters.</p>}
      </div>
    </div>
  );
}

function Chip({
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
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/60 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
