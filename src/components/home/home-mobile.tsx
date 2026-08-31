import { Link } from "@tanstack/react-router";
import { ArrowRight, Camera, Car, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PropCardMobile } from "@/components/prop-card-mobile";
import { CinematicHero } from "@/components/cinematic-hero";
import { inrCompact } from "@/lib/format";
import type { Prop } from "@/lib/types";

const DEPARTMENTS = [
  { icon: ShieldCheck, label: "Armory & Weapons" },
  { icon: Camera, label: "Cinema Cameras" },
  { icon: Car, label: "Vintage Vehicles" },
  { icon: Sparkles, label: "Hero Gadgets" },
] as const;

const STATS = [
  { label: "Props in warehouse", value: "1,240+" },
  { label: "Warehouse valuation", value: inrCompact(18640000) },
  { label: "Productions served", value: "180+" },
] as const;

/** Mobile home screen: portrait hero, snap-scroll stats, department shortcuts, featured tiles. */
export function HomeMobile({
  featured,
  loading,
  onRent,
}: {
  featured: Prop[];
  loading: boolean;
  onRent: (prop: Prop) => void;
}) {
  return (
    <div className="pb-24">
      <CinematicHero />

      <section className="border-t border-border bg-background px-4 py-6">
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="min-w-[63%] snap-start rounded-2xl border border-primary/20 bg-card p-4"
            >
              <p className="font-display text-3xl tracking-wide text-gradient-gold">{s.value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-6" aria-label="Departments">
        <h2 className="text-2xl">
          Browse <span className="text-gradient-gold">Departments</span>
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {DEPARTMENTS.map((d) => (
            <Link
              key={d.label}
              to="/catalog"
              className="rounded-2xl border border-primary/20 bg-card p-4 active:border-primary/60"
            >
              <span className="grid size-9 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                <d.icon className="size-4" />
              </span>
              <p className="mt-2 text-xs font-bold uppercase tracking-wider">{d.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-4 pb-6" aria-label="How it works">
        <h2 className="text-2xl">
          How Rentals <span className="text-gradient-gold">Work</span>
        </h2>
        <ol className="mt-3 space-y-2">
          {[
            "Build your shoot wishlist from the catalog",
            "Our desk quotes rates for your dates",
            "Pay the advance and we dispatch to set",
            "Return the props — we settle the final invoice",
          ].map((step, i) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-sm"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="min-w-0 text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="px-4 pb-8" aria-label="Featured props">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="truncate text-2xl">
            Hero <span className="text-gradient-gold">Props</span>
          </h2>
          <Link
            to="/catalog"
            className="shrink-0 text-xs font-bold uppercase tracking-wider text-primary"
          >
            All →
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {loading
            ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)
            : featured.map((prop) => (
                <PropCardMobile key={prop.id} prop={prop} onRent={onRent} />
              ))}
        </div>
      </section>

      <section className="px-4 pb-10">
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 text-center">
          <Truck className="mx-auto size-6 text-primary" />
          <p className="mt-2 font-display text-xl tracking-wide">Prop not in the catalog?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Send a reference photo — our team sources or fabricates it for your shoot.
          </p>
          <Button className="mt-4 w-full" asChild>
            <Link to="/catalog">
              Open Catalog <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
