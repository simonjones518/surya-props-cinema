import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api, queryKeys } from "@/lib/api";
import { PropCard } from "@/components/prop-card";
import { RentModal } from "@/components/rent-modal";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Prop } from "@/lib/types";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Prop Rental Catalog — Surya Cine Special Props" },
      {
        name: "description",
        content:
          "Rent screen-ready film props in India: vintage weapons, cinema camera rigs, retro vehicles and hero gadgets with daily and weekly rates in ₹.",
      },
      { property: "og:title", content: "Prop Rental Catalog — Surya Cine Special Props" },
      {
        property: "og:description",
        content: "Browse action armory, cinema cameras, vintage vehicles and hero gadgets with live stock status.",
      },
    ],
  }),
  component: CatalogPage,
});

const GENRES = ["Mass Action", "Retro 80s", "Sci-Fi", "Crime Thriller"] as const;

function CatalogPage() {
  const [category, setCategory] = useState("all");
  const [genre, setGenre] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Prop | null>(null);

  const categories = useQuery({ queryKey: queryKeys.categories, queryFn: api.getCategories });
  const props = useQuery({ queryKey: queryKeys.props, queryFn: api.getProps });

  const filtered = useMemo(() => {
    const list = props.data ?? [];
    return list.filter(
      (p) =>
        (category === "all" || p.category_slug === category) &&
        (!genre || p.genre_tags.includes(genre)) &&
        (search.trim() === "" ||
          `${p.title} ${p.serial_number} ${p.description}`.toLowerCase().includes(search.toLowerCase())),
    );
  }, [props.data, category, genre, search]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.38em] text-primary">Rental Catalog</p>
        <h1 className="mt-3 text-4xl sm:text-6xl">
          <span className="text-gradient-gold">Screen-Ready Props</span>, Booked in Minutes
        </h1>
        <p className="mt-4 text-sm text-muted-foreground sm:text-base">
          Live inventory with daily and weekly rates in ₹, condition grading and refundable security deposits.
        </p>
      </header>

      <div className="mt-8 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search props or serial number"
            className="pl-9"
            aria-label="Search props"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Pill active={category === "all"} onClick={() => setCategory("all")}>
            All Departments
          </Pill>
          {(categories.data ?? []).map((c) => (
            <Pill key={c.slug} active={category === c.slug} onClick={() => setCategory(c.slug)}>
              {c.name}
            </Pill>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <Pill key={g} subtle active={genre === g} onClick={() => setGenre(genre === g ? null : g)}>
              #{g}
            </Pill>
          ))}
        </div>
      </div>

      {props.isLoading ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[430px] rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">No props match these filters.</p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((prop) => (
            <PropCard key={prop.id} prop={prop} onRent={setSelected} />
          ))}
        </div>
      )}

      <RentModal prop={selected} open={selected !== null} onOpenChange={(v) => !v && setSelected(null)} />
    </main>
  );
}

function Pill({
  active,
  subtle,
  onClick,
  children,
}: {
  active: boolean;
  subtle?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/60 hover:text-foreground"
      } ${subtle ? "tracking-normal normal-case" : ""}`}
    >
      {children}
    </button>
  );
}