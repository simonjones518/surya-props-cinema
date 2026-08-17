import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, queryKeys } from "@/lib/api";
import { prettyDate } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";
import type { PropRequest, RequestStatus } from "@/lib/types";

const FLOW: Record<RequestStatus, RequestStatus[]> = {
  New: ["Contacted", "Rejected"],
  Contacted: ["Quoted", "Rejected"],
  Quoted: ["Fulfilled", "Rejected"],
  Fulfilled: [],
  Rejected: ["New"],
};

/** Admin view of incoming customer prop requests (catalog + custom). */
export function RequestsTable() {
  const qc = useQueryClient();
  const requests = useQuery({ queryKey: queryKeys.requests, queryFn: api.getPropRequests });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: RequestStatus }) =>
      api.updateRequestStatus(id, status),
    onSuccess: (_r, vars) => {
      qc.setQueryData<PropRequest[]>(queryKeys.requests, (old) =>
        (old ?? []).map((r) => (r.id === vars.id ? { ...r, status: vars.status } : r)),
      );
      toast.success(`Request marked ${vars.status}`);
    },
    onError: (e: Error) => toast.error("Update failed", { description: e.message }),
  });

  if (requests.isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  const rows = requests.data ?? [];

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-primary/20 bg-card p-6 text-center text-muted-foreground">
        No customer requests yet — they land here the moment a client submits from the catalog.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <article key={r.id} className="rounded-xl border border-primary/20 bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-primary">{r.request_code}</p>
              <h3 className="font-display text-xl tracking-wide">{r.prop_title || "Custom prop"}</h3>
              <p className="text-xs text-muted-foreground">
                {r.request_type} · ×{r.quantity} · {prettyDate(r.created_at)}
              </p>
            </div>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              {r.status}
            </span>
          </div>

          {r.custom_description && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{r.custom_description}</p>
          )}

          {r.reference_image_urls.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {r.reference_image_urls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  <img
                    src={url}
                    alt={`Reference for ${r.prop_title}`}
                    className="size-20 rounded-lg border border-primary/30 object-cover"
                  />
                </a>
              ))}
            </div>
          )}

          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-4">
            <Info label="Production House" value={r.production_house || "—"} />
            <Info label="Contact" value={`${r.contact_person} · ${r.phone}`} />
            <Info
              label="Shoot Window"
              value={
                r.shoot_start_date && r.shoot_wrap_date
                  ? `${prettyDate(r.shoot_start_date)} → ${prettyDate(r.shoot_wrap_date)}`
                  : "Not specified"
              }
            />
            <Info label="Notes" value={r.notes || "—"} />
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <a
                href={whatsappLink(
                  `Hi ${r.contact_person}, regarding your request ${r.request_code} for "${r.prop_title}" at Surya Cine Special Props —`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-4" />
                WhatsApp Desk
              </a>
            </Button>
            {FLOW[r.status].map((next) => (
              <Button
                key={next}
                size="sm"
                variant={next === "Rejected" ? "outline" : "default"}
                disabled={setStatus.isPending}
                onClick={() => setStatus.mutate({ id: r.id, status: next })}
              >
                Mark {next}
              </Button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground">{value}</dd>
    </div>
  );
}
