import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, LayoutGrid, LogIn, ShoppingBag, User } from "lucide-react";
import { QuoteCart } from "@/components/quote-cart";
import { portal, portalKeys } from "@/lib/portal-api";
import { useWishlist } from "@/lib/wishlist";

/** App-style bottom navigation for the public mobile site. */
export function MobileTabBar() {
  const [cartOpen, setCartOpen] = useState(false);
  const { count } = useWishlist();
  const session = useQuery({ queryKey: portalKeys.session, queryFn: portal.session });

  const item = "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-bold uppercase tracking-wider";

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="glass-panel fixed inset-x-0 bottom-0 z-50 flex border-t border-border px-2 pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      >
        <Link
          to="/"
          activeOptions={{ exact: true }}
          className={`${item} text-muted-foreground`}
          activeProps={{ className: "text-primary" }}
        >
          <Home className="size-5" /> Home
        </Link>
        <Link
          to="/catalog"
          className={`${item} text-muted-foreground`}
          activeProps={{ className: "text-primary" }}
        >
          <LayoutGrid className="size-5" /> Catalog
        </Link>
        <button type="button" onClick={() => setCartOpen(true)} className={`${item} relative text-muted-foreground`}>
          <span className="relative">
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -right-2 -top-1.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </span>
          Wishlist
        </button>
        {session.data ? (
          <Link
            to="/client/portal"
            className={`${item} text-muted-foreground`}
            activeProps={{ className: "text-primary" }}
          >
            <User className="size-5" /> Portal
          </Link>
        ) : (
          <Link
            to="/auth"
            className={`${item} text-muted-foreground`}
            activeProps={{ className: "text-primary" }}
          >
            <LogIn className="size-5" /> Login
          </Link>
        )}
      </nav>

      <QuoteCart open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
}
