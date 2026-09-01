import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { staffApi, staffKeys } from "@/lib/staff-api";
import type { StaffRole } from "@/lib/staff-types";

const ROLES: { value: StaffRole; label: string; hint: string }[] = [
  { value: "inventory", label: "Inventory Staff", hint: "Stock intake, racks, condition updates" },
  { value: "field", label: "Field Operations", hint: "Dispatch logs, on-set photos, damage reports" },
];

export function StaffManager() {
  const qc = useQueryClient();
  const staff = useQuery({ queryKey: staffKeys.staff, queryFn: staffApi.listStaff });
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    username: "",
    password: "",
    staff_role: "field" as StaffRole,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: staffKeys.staff });

  const create = useMutation({
    mutationFn: () => staffApi.createStaff(form),
    onSuccess: (row) => {
      invalidate();
      setForm({ full_name: "", phone: "", username: "", password: "", staff_role: form.staff_role });
      toast.success(`${row.full_name} can now sign in`, {
        description: `Staff code ${row.staff_code} · portal /staff-login`,
      });
    },
    onError: (e: Error) => toast.error("Could not create account", { description: e.message }),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: number; active: boolean }) => staffApi.setActive(v.id, v.active),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Update failed", { description: e.message }),
  });


  const reset = useMutation({
    mutationFn: (v: { id: number; password: string }) => staffApi.resetPassword(v.id, v.password),
    onSuccess: () => toast.success("Password updated"),
    onError: (e: Error) => toast.error("Reset failed", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => staffApi.deleteStaff(id),
    onSuccess: () => {
      invalidate();
      toast.success("Staff account removed");
    },
    onError: (e: Error) => toast.error("Delete failed", { description: e.message }),
  });

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr] print:hidden" aria-label="Staff accounts">
      <form
        className="space-y-4 rounded-xl border border-primary/25 bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <h3 className="font-display text-2xl tracking-wide">Create Staff Login</h3>
        <p className="text-xs text-muted-foreground">
          Accounts are created only here by the manager. Staff sign in at <code>/staff-login</code>.
        </p>
        <div className="grid gap-2">
          <Label htmlFor="sf-name">Full name</Label>
          <Input
            id="sf-name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sf-phone">Phone</Label>
          <Input
            id="sf-phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Role</legend>
          {ROLES.map((r) => (
            <label
              key={r.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs transition-colors ${
                form.staff_role === r.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <input
                type="radio"
                name="staff_role"
                className="mt-0.5"
                checked={form.staff_role === r.value}
                onChange={() => setForm({ ...form, staff_role: r.value })}
              />
              <span>
                <span className="block font-bold uppercase tracking-wider">{r.label}</span>
                <span className="text-muted-foreground">{r.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-[11px] text-muted-foreground">
          Wages are not fixed here. Enter each worker's wage at dispatch time, per project.
        </p>

        <div className="grid gap-2">
          <Label htmlFor="sf-user">Username</Label>
          <Input
            id="sf-user"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="ravi.field"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sf-pass">Temporary password</Label>
          <Input
            id="sf-pass"
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="min 6 characters"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={create.isPending}>
          <UserPlus className="size-4" /> {create.isPending ? "Creating…" : "Create Account"}
        </Button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-primary/20 bg-card">
        {staff.isLoading ? (
          <div className="p-6">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : staff.isError ? (
          <p className="p-6 text-sm text-amber-neon">
            Staff tables are not created yet. Run <code>db/surya-phase-2.sql</code> in your database,
            then reload. ({(staff.error as Error).message})
          </p>
        ) : (staff.data ?? []).length === 0 ? (
          <p className="p-6 text-center text-muted-foreground">
            No staff accounts yet — create the first inventory or field-operations login.
          </p>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Wage</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(staff.data ?? []).map((s) => (
                <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <span className="font-semibold">{s.full_name}</span>
                    <span className="block font-mono text-[11px] text-muted-foreground">
                      {s.staff_code} · {s.phone || "no phone"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wider text-primary">
                    {s.staff_role === "inventory" ? "Inventory" : "Field Ops"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{s.username}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    Set per dispatch
                  </td>

                  <td className="px-4 py-3 text-xs">
                    {s.active ? (
                      <span className="text-success">Active</span>
                    ) : (
                      <span className="text-muted-foreground">Suspended</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggle.mutate({ id: s.id, active: !s.active })}
                      >
                        {s.active ? "Suspend" : "Reactivate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const next = window.prompt(`New password for ${s.full_name}`);
                          if (next) reset.mutate({ id: s.id, password: next });
                        }}
                      >
                        <KeyRound className="size-3.5" /> Reset
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (window.confirm(`Delete ${s.full_name}'s login?`)) remove.mutate(s.id);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
