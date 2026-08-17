import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLogin } from "@/lib/admin-gate.functions";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Admin ERP Login — Surya Cine Special Props" },
      {
        name: "description",
        content:
          "Secure sign-in for the Surya Cine Special Props rental ERP: manage props inventory, bookings and deposits.",
      },
      { property: "og:title", content: "Admin ERP Login — Surya Cine Special Props" },
      {
        property: "og:description",
        content: "Restricted access to the Surya Cine Special Props rental ERP dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const router = useRouter();
  const login = useServerFn(adminLogin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await login({ data: { username, password } });
      if (res.ok) {
        toast.success("Welcome back, Surya");
        await router.navigate({ to: "/admin", replace: true });
      } else {
        toast.error("Invalid credentials");
      }
    } catch (err) {
      toast.error("Sign-in failed", { description: (err as Error).message });
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-5 py-16">
      <div className="glass-panel shadow-cine rounded-xl border border-primary/25 p-7 sm:p-9">
        <span className="grid size-11 place-items-center rounded-md border border-primary/40 bg-primary/10 text-primary">
          <Lock className="size-5" />
        </span>
        <h1 className="mt-5 font-display text-3xl tracking-wide text-gradient-gold sm:text-4xl">
          Admin ERP Access
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Restricted console for Surya Cine Special Props inventory, rentals and deposits.
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={pending} className="w-full font-bold uppercase tracking-wider">
            {pending ? "Verifying…" : "Enter Dashboard"}
          </Button>
        </form>
      </div>
    </main>
  );
}