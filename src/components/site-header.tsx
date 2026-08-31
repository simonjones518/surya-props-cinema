import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, LogIn, LogOut, Menu, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { QuoteCart } from "@/components/quote-cart";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { portal, portalKeys } from "@/lib/portal-api";
import { useWishlist } from "@/lib/wishlist";

const nav = [
  { to: "/", label: "Home" },
  { to: "/catalog", label: "Catalog" },
] as const;

export function SiteHeader() {
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { count } = useWishlist();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const session = useQuery({ queryKey: portalKeys.session, queryFn: portal.session });

  const signOut = useMutation({
    mutationFn: () => portal.signOut(),
    onSuccess: async () => {
      await qc.cancelQueries();
      qc.clear();
      setMenuOpen(false);
      await navigate({ to: "/", replace: true });
    },
  });

  return (
    <header className="glass-panel sticky top-0 z-50 border-b border-border print:hidden">
      <div className="mx-auto grid h-14 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:h-16 sm:px-6">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-3"
          aria-label="Surya Cine Special Props — home"
        >
          <BrandLogo className="h-8 shrink-0 sm:h-11" />
        </Link>

        {/* Desktop / tablet navigation */}
        <nav className="hidden items-center gap-1 text-sm md:flex" aria-label="Main">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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
                className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                My Portal
              </Link>
              <button
                type="button"
                onClick={() => signOut.mutate()}
                className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-primary/40 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              <LogIn className="size-3.5" /> Client Login
            </Link>
          )}
        </nav>

        {/* Mobile: cart + menu only — primary navigation lives in the bottom tab bar */}
        <div className="flex items-center gap-1 md:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Shoot wishlist — ${count} item${count === 1 ? "" : "s"}`}
            className="relative grid size-10 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground"
          >
            <ShoppingBag className="size-4" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </button>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className="grid size-10 shrink-0 place-items-center rounded-lg border border-primary/40 text-primary"
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] border-primary/25 bg-card p-0 sm:max-w-sm">
              <div className="border-b border-border p-5">
                <BrandLogo className="h-9" />
                <p className="mt-3 text-xs text-muted-foreground">
                  {session.data ? session.data.email : "Screen-ready props on rent across India"}
                </p>
              </div>
              <nav className="flex flex-col p-3" aria-label="Mobile menu">
                {nav.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-3 py-3 text-base font-semibold text-muted-foreground"
                    activeOptions={{ exact: item.to === "/" }}
                    activeProps={{ className: "bg-primary/10 text-primary" }}
                  >
                    {item.label}
                  </Link>
                ))}
                {session.data ? (
                  <>
                    <Link
                      to="/client/portal"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-3 text-base font-semibold text-primary"
                    >
                      <LayoutDashboard className="size-4" /> My Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={() => signOut.mutate()}
                      className="flex items-center gap-2 rounded-lg px-3 py-3 text-left text-base font-semibold text-muted-foreground"
                    >
                      <LogOut className="size-4" /> Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setMenuOpen(false)}
                    className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-3 text-base font-bold text-primary-foreground"
                  >
                    <LogIn className="size-4" /> Client Login
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <QuoteCart open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}
