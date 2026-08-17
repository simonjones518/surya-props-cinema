import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clapperboard, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { portal, portalKeys } from "@/lib/portal-api";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Production Account Sign In — Surya Cine Special Props" },
      {
        name: "description",
        content:
          "Sign in to the Surya Cine client portal to track rental quotations, advance payments, active shoots and final settlement invoices.",
      },
      { property: "og:title", content: "Production Account Sign In — Surya Cine Special Props" },
      {
        property: "og:description",
        content: "Filmmaker portal for rental quotations, advances and settlement invoices.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [productionHouse, setProductionHouse] = useState("");
  const [contact, setContact] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const session = useQuery({ queryKey: portalKeys.session, queryFn: portal.session });

  useEffect(() => {
    if (session.data) void navigate({ to: "/client/portal", replace: true });
  }, [session.data, navigate]);

  async function land() {
    await qc.invalidateQueries({ queryKey: portalKeys.session });
    await router.invalidate();
    await navigate({ to: "/client/portal", replace: true });
  }

  const signIn = useMutation({
    mutationFn: () => portal.signIn(email, password),
    onSuccess: async (res) => {
      if (!res.ok) {
        toast.error("Invalid email or password");
        return;
      }
      toast.success("Welcome back");
      await land();
    },
    onError: (e: Error) => toast.error("Sign in failed", { description: e.message }),
  });

  const signUp = useMutation({
    mutationFn: () =>
      portal.signUp({
        email,
        password,
        production_house: productionHouse,
        contact_person: contact,
        phone,
        designation,
      }),
    onSuccess: async () => {
      toast.success("Production account created");
      await land();
    },
    onError: (e: Error) => toast.error("Could not create the account", { description: e.message }),
  });

  const busy = signIn.isPending || signUp.isPending;
  const isSignUp = mode === "signup";

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-14">
      <div className="rounded-2xl border border-primary/25 bg-card p-6 shadow-cine sm:p-8">
        <span className="grid size-11 place-items-center rounded-md border border-primary/40 bg-primary/10 text-primary">
          <Clapperboard className="size-5" />
        </span>
        <h1 className="mt-5 font-display text-3xl tracking-wide text-gradient-gold">
          {isSignUp ? "Create Production Account" : "Client Portal Sign In"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One account for every banner you work with — track quotations, advances, active shoots and
          settlement invoices across all your projects.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (isSignUp) signUp.mutate();
            else signIn.mutate();
          }}
        >
          {isSignUp && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="cp">Your Full Name</Label>
                <Input
                  id="cp"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desig">Designation</Label>
                <Input
                  id="desig"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  maxLength={120}
                  placeholder="Art Director / Line Producer"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ph-no">Phone</Label>
                <Input
                  id="ph-no"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={24}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ph">Primary Production House (optional)</Label>
                <Input
                  id="ph"
                  value={productionHouse}
                  onChange={(e) => setProductionHouse(e.target.value)}
                  maxLength={160}
                  placeholder="Sun Pictures"
                />
                <p className="text-[11px] text-muted-foreground">
                  You can request props for any banner — pick or add one per shoot.
                </p>
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            {isSignUp && (
              <p className="text-[11px] text-muted-foreground">Minimum 8 characters.</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            {isSignUp ? <UserPlus className="size-4" /> : <LogIn className="size-4" />}
            {busy ? "Please wait…" : isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-5 w-full text-xs text-muted-foreground underline hover:text-primary"
          onClick={() => setMode(isSignUp ? "signin" : "signup")}
        >
          {isSignUp
            ? "Already have an account? Sign in"
            : "New production house? Create an account"}
        </button>
      </div>
    </main>
  );
}
