import { useState } from "react";
import { Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { PropCardMobile } from "@/components/prop-card-mobile";
import type { Category, Prop } from "@/lib/types";

type Props = {
  categories: Category[];
  genres: readonly string[];
  category: string;
  onCategory: (v: string) => void;
  genre: string | null;
  onGenre: (v: string | null) => void;
  search: string;
  onSearch: (v: string) => void;
  results: Prop[];
  loading: boolean;
  onRent: (prop: Prop) => void;
  onCustomRequest: () => void;
};

/** Mobile catalog: sticky search bar, filters in a bottom sheet, compact tiles. */
export function CatalogMobile({
  categories,
  genres,
  category,
  onCategory,
  genre,
  onGenre,
  search,
  onSearch,
  results,
  loading,
  onRent,
  onCustomRequest,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = (category !== "all" ? 1 : 0) + (genre ? 1 : 0);
  const activeName =
    category === "all" ? "All Departments" : (categories.find((c) => c.slug === category)?.name ?? "All");

  return (
    <main className="px-4 pb-28 pt-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-primary">Rental Catalog</p>
      <h1 className="mt-1 text-3xl leading-tight">
        <span className="text-gradient-gold">Screen-Ready Props</span>
      </h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Live inventory with configuration details and warehouse availability. Rates are quoted per
        production.
      </p>

      <div className="sticky top-14 z-30 -mx-4 mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search props"
            className="h-11 pl-9"
            aria-label="Search props"
          />
        </div>
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger
            aria-label="Open filters"
            className="relative grid size-11 shrink-0 place-items-center rounded-lg border border-primary/40 text-primary"
          >
            <SlidersHorizontal className="size-4" />
            {activeFilters > 0 && (
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {activeFilters}
              </span>
            )}
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto border-primary/25 bg-card">
            <p className="font-display text-xl tracking-wide text-gradient-gold">Filter Inventory</p>

            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Department
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip active={category === "all"} onClick={() => onCategory("all")}>
                All
              </Chip>
              {categories.map((c) => (
                <Chip key={c.slug} active={category === c.slug} onClick={() => onCategory(c.slug)}>
                  {c.name}
                </Chip>
              ))}
            </div>

            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Genre
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {genres.map((g) => (
                <Chip key={g} active={genre === g} onClick={() => onGenre(genre === g ? null : g)}>
                  #{g}
                </Chip>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  onCategory("all");
                  onGenre(null);
                }}
              >
                <X className="size-4" /> Clear
              </Button>
              <Button onClick={() => setFiltersOpen(false)}>Show {results.length} Props</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">
          {activeName}
          {genre ? ` · #${genre}` : ""}
        </span>
        <span className="shrink-0 font-semibold text-primary">{results.length} props</span>
      </div>

      <Button className="mt-4 h-11 w-full text-xs" onClick={onCustomRequest}>
        <Sparkles className="size-4" /> Prop Not Listed? Request Custom
      </Button>

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-primary/20 bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No props match these filters.</p>
          <Button className="mt-4 w-full" onClick={onCustomRequest}>
            <Sparkles className="size-4" /> Request It as a Custom Prop
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {results.map((prop) => (
            <PropCardMobile key={prop.id} prop={prop} onRent={onRent} />
          ))}
        </div>
      )}
    </main>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-secondary/50 text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}
