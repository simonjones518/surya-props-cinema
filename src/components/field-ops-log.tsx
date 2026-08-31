import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { staffApi, staffKeys } from "@/lib/staff-api";
import { prettyDate } from "@/lib/format";

const SEVERITY: Record<string, string> = {
  minor: "text-muted-foreground",
  major: "text-amber-neon",
  lost: "text-destructive",
};

export function FieldOpsLog() {
  const qc = useQueryClient();
  const logs = useQuery({ queryKey: staffKeys.dispatchLogs, queryFn: staffApi.dispatchLogs });
  const damages = useQuery({ queryKey: staffKeys.damageReports, queryFn: staffApi.damageReports });

  const resolve = useMutation({
    mutationFn: (id: number) => staffApi.resolveDamage(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: staffKeys.damageReports });
      toast.success("Damage report closed");
    },
    onError: (e: Error) => toast.error("Update failed", { description: e.message }),
  });

  const error = (logs.error ?? damages.error) as Error | null;

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-2 print:hidden" aria-label="Field operations log">
      <div className="rounded-xl border border-primary/20 bg-card">
        <h3 className="border-b border-border px-5 py-4 font-display text-2xl tracking-wide">
          Dispatch &amp; Return Logs
        </h3>
        {logs.isLoading ? (
          <div className="p-5">
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <p className="p-5 text-sm text-amber-neon">
            Field tables are not created yet — run <code>db/surya-phase-2.sql</code>. ({error.message})
          </p>
        ) : (logs.data ?? []).length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No field logs recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(logs.data ?? []).map((l) => (
              <li key={l.id} className="flex gap-3 px-5 py-4">
                {l.photo_url && (
                  <img
                    src={l.photo_url}
                    alt=""
                    className="size-16 shrink-0 rounded-lg border border-border object-cover"
                  />
                )}
                <div className="min-w-0 text-xs">
                  <p className="font-semibold uppercase tracking-wider text-primary">
                    {l.kind === "return" ? "Return" : "Dispatch"} · {l.quote_code}
                  </p>
                  <p className="mt-1 text-foreground">Vehicle {l.vehicle_number}</p>
                  {l.notes && <p className="mt-1 text-muted-foreground">{l.notes}</p>}
                  <p className="mt-1 text-muted-foreground">
                    {l.staff_name} · {prettyDate(l.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-primary/20 bg-card">
        <h3 className="border-b border-border px-5 py-4 font-display text-2xl tracking-wide">
          Damage &amp; Incident Reports
        </h3>
        {damages.isLoading ? (
          <div className="p-5">
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <p className="p-5 text-sm text-amber-neon">Awaiting phase-2 tables.</p>
        ) : (damages.data ?? []).length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No damages reported. Clean sheet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(damages.data ?? []).map((d) => (
              <li key={d.id} className="flex gap-3 px-5 py-4">
                {d.photo_url && (
                  <img
                    src={d.photo_url}
                    alt=""
                    className="size-16 shrink-0 rounded-lg border border-border object-cover"
                  />
                )}
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-semibold text-foreground">
                    {d.prop_name || "Unlisted prop"}{" "}
                    <span className={`uppercase tracking-wider ${SEVERITY[d.severity]}`}>
                      · {d.severity}
                    </span>
                  </p>
                  <p className="mt-1 text-muted-foreground">{d.description}</p>
                  <p className="mt-1 text-muted-foreground">
                    {d.quote_code} · {d.staff_name} · {prettyDate(d.created_at)}
                  </p>
                  {d.status === "open" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => resolve.mutate(d.id)}
                    >
                      Mark Resolved
                    </Button>
                  ) : (
                    <p className="mt-2 text-success">Resolved</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
