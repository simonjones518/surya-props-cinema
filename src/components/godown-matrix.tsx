import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Check, Pencil, Plus, Trash2, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { api, queryKeys } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Prop } from "@/lib/types";

/** Visual warehouse stock matrix: Godown → Rack → props, with inline godown/rack management. */
export function GodownMatrix({ props }: { props: Prop[] }) {
  const qc = useQueryClient();
  const godowns = useQuery({ queryKey: queryKeys.godowns, queryFn: api.getGodowns });
  const racks = useQuery({ queryKey: queryKeys.racks, queryFn: api.getRacks });
  const [activeGodown, setActiveGodown] = useState<number | null>(null);

  const [newGodown, setNewGodown] = useState({ name: "", location_code: "" });
  const [editGodown, setEditGodown] = useState<{ id: number; name: string; location_code: string } | null>(null);
  const [newRack, setNewRack] = useState("");
  const [editRack, setEditRack] = useState<{ id: number; rack_name: string } | null>(null);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.godowns });
    void qc.invalidateQueries({ queryKey: queryKeys.racks });
    void qc.invalidateQueries({ queryKey: queryKeys.props });
  };
  const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : "Action failed.");

  const addGodown = useMutation({
    mutationFn: () =>
      api.saveGodown({
        name: newGodown.name,
        ...(newGodown.location_code.trim() ? { location_code: newGodown.location_code } : {}),
      }),
    onSuccess: () => {
      setNewGodown({ name: "", location_code: "" });
      toast.success("Godown added.");
      invalidate();
    },
    onError,
  });
  const saveGodownEdit = useMutation({
    mutationFn: () =>
      api.updateGodown(editGodown!.id, {
        name: editGodown!.name,
        location_code: editGodown!.location_code,
      }),
    onSuccess: () => {
      setEditGodown(null);
      toast.success("Godown updated.");
      invalidate();
    },
    onError,
  });
  const removeGodown = useMutation({
    mutationFn: (id: number) => api.deleteGodown(id),
    onSuccess: () => {
      toast.success("Godown deleted.");
      setActiveGodown(null);
      invalidate();
    },
    onError,
  });
  const addRack = useMutation({
    mutationFn: (godown_id: number) => api.saveRack({ godown_id, rack_name: newRack }),
    onSuccess: () => {
      setNewRack("");
      toast.success("Rack added.");
      invalidate();
    },
    onError,
  });
  const saveRackEdit = useMutation({
    mutationFn: () => api.updateRack(editRack!.id, editRack!.rack_name),
    onSuccess: () => {
      setEditRack(null);
      toast.success("Rack renamed.");
      invalidate();
    },
    onError,
  });
  const removeRack = useMutation({
    mutationFn: (id: number) => api.deleteRack(id),
    onSuccess: () => {
      toast.success("Rack deleted.");
      invalidate();
    },
    onError,
  });

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
          const editing = editGodown?.id === g.id;
          return (
            <div
              key={g.id}
              className={`rounded-xl border px-4 py-3 transition-colors ${
                current === g.id ? "border-primary bg-primary/10" : "border-border bg-card"
              }`}
            >
              {editing ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={editGodown.name}
                    onChange={(e) => setEditGodown({ ...editGodown, name: e.target.value })}
                    className="h-8 w-48"
                    placeholder="Godown name"
                  />
                  <Input
                    value={editGodown.location_code}
                    onChange={(e) =>
                      setEditGodown({ ...editGodown, location_code: e.target.value })
                    }
                    className="h-8 w-24"
                    placeholder="GD-01"
                  />
                  <Button
                    size="icon"
                    className="size-8"
                    onClick={() => saveGodownEdit.mutate()}
                    disabled={saveGodownEdit.isPending}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => setEditGodown(null)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => setActiveGodown(g.id)} className="text-left">
                    <p className="font-display text-lg tracking-wide text-foreground">{g.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {g.location_code} · {count} props · {onSet} on-set
                    </p>
                  </button>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() =>
                        setEditGodown({ id: g.id, name: g.name, location_code: g.location_code })
                      }
                      aria-label={`Edit ${g.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive"
                      onClick={() => {
                        if (confirm(`Delete ${g.name}? Its racks will be removed too.`))
                          removeGodown.mutate(g.id);
                      }}
                      aria-label={`Delete ${g.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border p-3">
        <Input
          value={newGodown.name}
          onChange={(e) => setNewGodown({ ...newGodown, name: e.target.value })}
          placeholder="New godown name"
          className="h-9 w-56"
        />
        <Input
          value={newGodown.location_code}
          onChange={(e) => setNewGodown({ ...newGodown, location_code: e.target.value })}
          placeholder="Location code (optional)"
          className="h-9 w-44"
        />
        <Button
          onClick={() => addGodown.mutate()}
          disabled={!newGodown.name.trim() || addGodown.isPending}
        >
          <Plus className="mr-1 size-4" /> Add Godown
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {godownRacks.map((rack) => {
          const items = props.filter((p) => p.rack_id === rack.id);
          const editing = editRack?.id === rack.id;
          return (
            <div key={rack.id} className="rounded-xl border border-primary/20 bg-card p-4">
              {editing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editRack.rack_name}
                    onChange={(e) => setEditRack({ ...editRack, rack_name: e.target.value })}
                    className="h-8"
                  />
                  <Button
                    size="icon"
                    className="size-8"
                    onClick={() => saveRackEdit.mutate()}
                    disabled={saveRackEdit.isPending}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => setEditRack(null)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg tracking-wide text-primary">
                      {rack.rack_name}
                    </p>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {items.length} prop{items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => setEditRack({ id: rack.id, rack_name: rack.rack_name })}
                      aria-label={`Rename ${rack.rack_name}`}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive"
                      onClick={() => {
                        if (confirm(`Delete ${rack.rack_name}?`)) removeRack.mutate(rack.id);
                      }}
                      aria-label={`Delete ${rack.rack_name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
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

      {current != null && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border p-3">
          <Input
            value={newRack}
            onChange={(e) => setNewRack(e.target.value)}
            placeholder="New rack name (e.g. Rack A)"
            className="h-9 w-56"
          />
          <Button
            variant="secondary"
            onClick={() => addRack.mutate(current)}
            disabled={!newRack.trim() || addRack.isPending}
          >
            <Plus className="mr-1 size-4" /> Add Rack
          </Button>
        </div>
      )}

      {unassigned.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {unassigned.length} prop(s) have no godown / rack assigned yet — edit them in Inventory &amp; Stock.
        </p>
      )}
    </div>
  );
}
