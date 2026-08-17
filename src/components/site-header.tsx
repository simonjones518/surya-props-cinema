import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clapperboard, LogIn, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { QuoteCart } from "@/components/quote-cart";
import { portal, portalKeys } from "@/lib/portal-api";
import { useWishlist } from "@/lib/wishlist";

const nav = [
  { to: "/", label: "Home" },
  { to: "/catalog", label: "Catalog" },
  { to: "/admin", label: "Admin ERP" },
] as const;

export function SiteHeader() {
  const [cartOpen, setCartOpen] = useState(false);
  const { count } = useWishlist();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const session = useQuery({ queryKey: portalKeys.session, queryFn: portal.session });

  const signOut = useMutation({
    mutationFn: () => portal.signOut(),
    onSuccess: async () => {
      await qc.cancelQueries();
      qc.clear();
      await navigate({ to: "/", replace: true });
    },
  });

  return (
    <header className="glass-panel sticky top-0 z-50 border-b border-border print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md border border-primary/40 bg-primary/10 text-primary">
            <Clapperboard className="size-5" />
          </span>
          <span className="leading-none">
            <span className="block font-display text-lg tracking-widest text-gradient-gold">
              SURYA CINE
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
              Special Props
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm" aria-label="Main">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="whitespace-nowrap rounded-md px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:text-sm sm:normal-case"
              activeProps={{ className: "bg-primary/10 text-primary" }}
            >
              {item.label}
            </Link>
          ))}

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Shoot wishlist — ${count} item${count === 1 ? "" : "s"}`}
            className="relative rounded-md px-2.5 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ShoppingBag className="size-4" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </button>

          {session.data ? (
            <>
              <Link
                to="/client/portal"
                className="whitespace-nowrap rounded-md px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary/10 sm:text-sm sm:normal-case"
              >
                My Portal
              </Link>
              <button
                type="button"
                onClick={() => signOut.mutate()}
                className="whitespace-nowrap rounded-md px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-primary/40 px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary/10"
            >
              <LogIn className="size-3.5" /> Client Login
            </Link>
          )}
        </nav>
      </div>

      <QuoteCart open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}
