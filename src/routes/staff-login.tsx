import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HardHat, LogIn } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { staffApi } from "@/lib/staff-api";

export const Route = createFileRoute("/staff-login")({
  head: () => ({
    meta: [
      { title: "Staff & Field Crew Login — Surya Cine Special Props" },
      {
        name: "description",
        content:
          "Secure sign-in for Surya Cine Special Props inventory staff and field operations crew to log dispatches, returns and on-set damage reports.",
      },
      { property: "og:title", content: "Staff & Field Crew Login — Surya Cine Special Props" },
      {
        property: "og:description",
        content: "Warehouse and field-operations crew portal for dispatch logs and damage reporting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffLoginPage,
});

function StaffLoginPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const signIn = useMutation({
    mutationFn: () => staffApi.signIn(username, password),
    onSuccess: async (res) => {
      if (!res.ok) {
        toast.error("Invalid credentials", { description: "Check your username and password." });
        return;
      }
      qc.clear();
      await router.navigate({ to: "/worker/portal", replace: true });
    },
    onError: (e: Error) => toast.error("Sign-in failed", { description: e.message }),
  });

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-primary/25 bg-card p-7 surface-metal">
        <BrandLogo className="h-12" />
        <p className="mt-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.32em] text-primary">
          <HardHat className="size-4" /> Crew Access
        </p>
        <h1 className="mt-2 text-3xl">Staff &amp; Field Login</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Inventory staff and field-operations crew only. Your manager issues these credentials.
        </p>

        <form
          className="mt-7 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            signIn.mutate();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="st-user">Username</Label>
            <Input
              id="st-user"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="st-pass">Password</Label>
            <Input
              id="st-pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={signIn.isPending}>
            <LogIn className="size-4" /> {signIn.isPending ? "Signing in…" : "Enter Crew Portal"}
          </Button>
        </form>
      </div>
    </main>
  );
}
