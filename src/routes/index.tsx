import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CinematicHero } from "@/components/cinematic-hero";
import { PropCard } from "@/components/prop-card";
import { RentModal } from "@/components/rent-modal";
import { api, queryKeys } from "@/lib/api";
import { inrCompact } from "@/lib/format";
import type { Prop } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Surya Cine Special Props — Film Prop Rental in India" },
      {
        name: "description",
        content:
          "Rent screen-ready film props: vintage armory, cinema camera rigs, retro vehicles and hero gadgets. Request a custom rental quote for your shoot dates — pricing shared privately.",
      },
      { property: "og:title", content: "Surya Cine Special Props — Film Prop Rental" },
      {
        property: "og:description",
        content: "Where real props bring stories to life. Action armory, cinema cameras and vintage film vehicles on rent.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [selected, setSelected] = useState<Prop | null>(null);
  const props = useQuery({ queryKey: queryKeys.props, queryFn: api.getProps });
  const featured = (props.data ?? []).filter((p) => p.status === "In-Stock").slice(0, 3);

  return (
    <>
      <CinematicHero />

      <section className="relative z-10 border-t border-border bg-background">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:grid-cols-3 sm:px-6">
          {[
            { label: "Props in warehouse", value: "1,240+" },
            { label: "Warehouse valuation", value: inrCompact(18640000) },
            { label: "Productions served", value: "180+" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-primary/20 bg-card p-6">
              <p className="font-display text-4xl tracking-wide text-gradient-gold">{s.value}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl sm:text-4xl">
            Hero Props <span className="text-gradient-gold">Ready to Ship</span>
          </h2>
          <Link
            to="/catalog"
            className="text-sm font-bold uppercase tracking-wider text-primary hover:text-amber-neon"
          >
            View full catalog →
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((prop) => (
            <PropCard key={prop.id} prop={prop} onRent={setSelected} />
          ))}
        </div>
      </section>

      <RentModal prop={selected} open={selected !== null} onOpenChange={(v) => !v && setSelected(null)} />
    </>
  );
}
