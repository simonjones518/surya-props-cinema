import { Link } from "@tanstack/react-router";
import { Clapperboard } from "lucide-react";

const nav = [
  { to: "/", label: "Home" },
  { to: "/catalog", label: "Catalog" },
  { to: "/admin", label: "Admin ERP" },
] as const;

export function SiteHeader() {
  return (
    <header className="glass-panel sticky top-0 z-50 border-b border-border">
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
              className="rounded-md px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-primary/10 text-primary" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
