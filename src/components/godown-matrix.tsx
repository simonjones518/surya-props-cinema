import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Truck } from "lucide-react";
import { api, queryKeys } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import type { Prop } from "@/lib/types";

/** Visual warehouse stock matrix: Godown → Rack → props, with on-set indicators. */
export function GodownMatrix({ props }: { props: Prop[] }) {
  const godowns = useQuery({ queryKey: queryKeys.godowns, queryFn: api.getGodowns });
  const racks = useQuery({ queryKey: queryKeys.racks, queryFn: api.getRacks });
  const [activeGodown, setActiveGodown] = useState<number | null>(null);

  const list = godowns.data ?? [];
  const current = activeGodown ?? list[0]?.id ?? null;
  const godownRacks = useMemo(
    () => (racks.data ?? []).filter((r) => r.godown_id === current),
    [racks.data, current],
  );
  const unassigned = props.filter((p) => !p.rack_id);

  if (godowns.isLoading || racks.isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {list.map((g) => {
          const count = props.filter((p) => p.godown_id === g.id).length;
          const onSet = props.filter((p) => p.godown_id === g.id && p.status === "On-Set").length;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveGodown(g.id)}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                current === g.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/60"
              }`}
            >
              <p className="font-display text-lg tracking-wide text-foreground">{g.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {g.location_code} · {count} props · {onSet} on-set
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {godownRacks.map((rack) => {
          const items = props.filter((p) => p.rack_id === rack.id);
          return (
            <div key={rack.id} className="rounded-xl border border-primary/20 bg-card p-4">
              <p className="font-display text-lg tracking-wide text-primary">{rack.rack_name}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {items.length} prop{items.length === 1 ? "" : "s"}
              </p>
              <ul className="mt-3 space-y-2">
                {items.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-2 text-sm">
                    <span>
                      <span className="font-semibold text-foreground">{p.title}</span>
                      <span className="block font-mono text-[10px] text-muted-foreground">
                        {p.serial_number}
                      </span>
                    </span>
                    <span
                      className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        p.status === "In-Stock"
                          ? "border-success/50 text-success"
                          : "border-amber-neon/50 text-amber-neon"
                      }`}
                    >
                      {p.status === "In-Stock" ? <Boxes className="size-3" /> : <Truck className="size-3" />}
                      {p.status === "In-Stock" ? "In Godown" : p.status}
                    </span>
                  </li>
                ))}
                {items.length === 0 && <li className="text-xs text-muted-foreground">Empty rack.</li>}
              </ul>
            </div>
          );
        })}
      </div>

      {unassigned.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {unassigned.length} prop(s) have no godown / rack assigned yet — edit them in Inventory &amp; Stock.
        </p>
      )}
    </div>
  );
}
