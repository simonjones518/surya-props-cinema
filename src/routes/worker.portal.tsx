import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Camera, LogOut, MapPin, PackageOpen, Truck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { staffApi, staffKeys } from "@/lib/staff-api";
import { prettyDate } from "@/lib/format";
import type { FieldAssignment } from "@/lib/staff-types";

export const Route = createFileRoute("/worker/portal")({
  head: () => ({
    meta: [
      { title: "Field Operations Portal — Surya Cine Special Props" },
      {
        name: "description",
        content:
          "Mobile field-operations portal: log prop dispatches and returns with vehicle numbers and photos, and report on-set damage instantly.",
      },
      { property: "og:title", content: "Field Operations Portal — Surya Cine Special Props" },
      {
        property: "og:description",
        content: "On-set dispatch logging, return confirmation and damage reporting for the Surya crew.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkerPortal,
});

type Mode = { assignment: FieldAssignment; kind: "dispatch" | "return" | "damage" } | null;

function WorkerPortal() {
  const router = useRouter();
  const qc = useQueryClient();
  const session = useQuery({ queryKey: staffKeys.session, queryFn: staffApi.session });
  const assignments = useQuery({
    queryKey: staffKeys.assignments,
    queryFn: staffApi.assignments,
    enabled: !!session.data,
    refetchInterval: 30_000,
  });
  const logs = useQuery({
    queryKey: staffKeys.dispatchLogs,
    queryFn: staffApi.dispatchLogs,
    enabled: !!session.data,
  });
  const [mode, setMode] = useState<Mode>(null);

  if (session.isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Skeleton className="h-64 w-full rounded-xl" />
      </main>
    );
  }

  if (!session.data) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <BrandLogo className="mx-auto h-12" />
        <h1 className="mt-6 text-3xl">Crew Sign-In Required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This portal is for inventory staff and field-operations crew.
        </p>
        <Button className="mt-6" onClick={() => router.navigate({ to: "/staff-login" })}>
          Go to Staff Login
        </Button>
      </main>
    );
  }

  const me = session.data;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:pb-14 lg:pt-12">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-primary/20 bg-card p-4 lg:flex lg:flex-wrap lg:justify-between lg:border-0 lg:bg-transparent lg:p-0">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-primary">
            {me.staff_role === "inventory" ? "Inventory Staff" : "Field Operations"}
          </p>
          <h1 className="mt-1 truncate text-2xl lg:text-3xl">{me.full_name}</h1>
          <p className="font-mono text-xs text-muted-foreground">{me.staff_code}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 lg:size-auto lg:px-4"
          onClick={async () => {
            await staffApi.signOut();
            qc.clear();
            await router.navigate({ to: "/staff-login", replace: true });
          }}
        >
          <LogOut className="size-4" /> <span className="hidden lg:inline">Sign Out</span>
        </Button>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
      <section className="mt-6 space-y-4 lg:mt-10" aria-label="My assignments">
        <h2 className="text-2xl">Active Shoot Assignments</h2>
        {assignments.isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : assignments.isError ? (
          <p className="rounded-xl border border-primary/20 bg-card p-5 text-sm text-amber-neon">
            Field tables are not created yet — ask the manager to run <code>db/surya-phase-2.sql</code>.
          </p>
        ) : (assignments.data ?? []).length === 0 ? (
          <p className="rounded-xl border border-primary/20 bg-card p-6 text-center text-muted-foreground">
            No active assignments right now.
          </p>
        ) : (
          (assignments.data ?? []).map((a) => (
            <article key={a.id} className="rounded-xl border border-primary/20 bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-primary">{a.quote_code}</p>
                  <h3 className="font-display text-2xl tracking-wide">
                    {a.movie_name || a.production_house}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {a.production_house} · {a.contact_person} · {a.phone}
                  </p>
                </div>
                <span className="rounded-full border border-border px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {a.status.replace(/_/g, " ")}
                </span>
              </div>

              <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3 text-primary" /> {a.shoot_location || "Location TBC"} ·{" "}
                {prettyDate(a.shoot_start_date)} → {prettyDate(a.estimated_return_date)}
              </p>

              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {a.items.map((i) => (
                  <li key={`${a.id}-${i.prop_id}-${i.prop_name}`}>
                    • {i.prop_name} ×{i.quantity}
                    {i.serial_number ? ` · ${i.serial_number}` : ""}
                  </li>
                ))}
              </ul>

              <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                <Button size="sm" onClick={() => setMode({ assignment: a, kind: "dispatch" })}>
                  <Truck className="size-4" /> Log Dispatch
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMode({ assignment: a, kind: "return" })}
                >
                  <PackageOpen className="size-4" /> Log Return
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMode({ assignment: a, kind: "damage" })}
                >
                  <AlertTriangle className="size-4" /> Report Damage
                </Button>
              </div>
            </article>
          ))
        )}
      </section>

      {mode && (
        <div className="lg:col-span-2">
        <FieldForm
          mode={mode}
          onClose={() => setMode(null)}
          onDone={() => {
            setMode(null);
            void qc.invalidateQueries({ queryKey: staffKeys.dispatchLogs });
            void qc.invalidateQueries({ queryKey: staffKeys.damageReports });
          }}
        />
        </div>
      )}

      <section className="mt-8 lg:mt-10" aria-label="My recent logs">
        <h2 className="text-2xl">Recent Field Logs</h2>
        <ul className="mt-4 space-y-2">
          {(logs.data ?? []).slice(0, 8).map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-xs"
            >
              <span>
                <span className="font-bold uppercase tracking-wider text-primary">{l.kind}</span> ·{" "}
                {l.quote_code} · Vehicle {l.vehicle_number}
              </span>
              <span className="text-muted-foreground">{prettyDate(l.created_at)}</span>
            </li>
          ))}
          {(logs.data ?? []).length === 0 && (
            <li className="rounded-lg border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
              Nothing logged yet.
            </li>
          )}
        </ul>
      </section>
      </div>
    </main>
  );
}

function FieldForm({
  mode,
  onClose,
  onDone,
}: {
  mode: NonNullable<Mode>;
  onClose: () => void;
  onDone: () => void;
}) {
  const { assignment, kind } = mode;
  const [vehicle, setVehicle] = useState("");
  const [notes, setNotes] = useState("");
  const [propName, setPropName] = useState(assignment.items[0]?.prop_name ?? "");
  const [severity, setSeverity] = useState<"minor" | "major" | "lost">("minor");
  const [file, setFile] = useState<File | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      const photo = file ? (await staffApi.uploadPhoto(file)).path : null;
      if (kind === "damage") {
        const item = assignment.items.find((i) => i.prop_name === propName);
        return staffApi.reportDamage({
          quote_id: assignment.id,
          prop_id: item?.prop_id ?? null,
          prop_name: propName,
          severity,
          description: notes,
          photo_path: photo,
        });
      }
      return staffApi.logDispatch({
        quote_id: assignment.id,
        kind,
        vehicle_number: vehicle,
        photo_path: photo,
        notes,
      });
    },
    onSuccess: () => {
      toast.success(kind === "damage" ? "Damage reported to manager" : "Field log saved");
      onDone();
    },
    onError: (e: Error) => toast.error("Could not save", { description: e.message }),
  });

  return (
    <form
      className="mt-6 space-y-4 rounded-xl border border-primary/40 bg-card p-5 surface-metal"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate();
      }}
    >
      <h3 className="font-display text-2xl tracking-wide">
        {kind === "damage" ? "Report Damage" : kind === "return" ? "Log Return" : "Log Dispatch"} ·{" "}
        {assignment.quote_code}
      </h3>

      {kind === "damage" ? (
        <>
          <div className="grid gap-2">
            <Label htmlFor="fd-prop">Prop</Label>
            <select
              id="fd-prop"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={propName}
              onChange={(e) => setPropName(e.target.value)}
            >
              {assignment.items.map((i) => (
                <option key={`${i.prop_id}-${i.prop_name}`} value={i.prop_name}>
                  {i.prop_name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fd-sev">Severity</Label>
            <select
              id="fd-sev"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as "minor" | "major" | "lost")}
            >
              <option value="minor">Minor — usable</option>
              <option value="major">Major — needs repair</option>
              <option value="lost">Lost / destroyed</option>
            </select>
          </div>
        </>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="fd-veh">Vehicle number</Label>
          <Input
            id="fd-veh"
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            placeholder="TS09 AB 1234"
            required
          />
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="fd-notes">{kind === "damage" ? "What happened?" : "Notes"}</Label>
        <textarea
          id="fd-notes"
          className="min-h-24 rounded-md border border-input bg-background p-3 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          required={kind === "damage"}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="fd-photo" className="flex items-center gap-2">
          <Camera className="size-4 text-primary" /> Photo proof
        </Label>
        <Input
          id="fd-photo"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? "Saving…" : "Submit"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
