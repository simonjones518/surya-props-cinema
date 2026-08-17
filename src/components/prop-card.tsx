import { Check, MapPin, Plus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConditionBadge, StockBadge } from "@/components/status-badge";
import { useWishlist } from "@/lib/wishlist";
import type { Prop } from "@/lib/types";

export function PropCard({ prop, onRent }: { prop: Prop; onRent: (prop: Prop) => void }) {
  const rentable = prop.status === "In-Stock";
  const { add, lines } = useWishlist();
  const inList = lines.some((l) => l.prop_id === prop.id);
  return (
    <article className="group overflow-hidden rounded-xl border border-primary/20 bg-card transition-all hover:border-primary/60 hover:glow-gold">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={prop.image_urls[0]}
          alt={prop.title}
          loading="lazy"
          width={1280}
          height={960}
          className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/25 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <StockBadge status={prop.status} />
        </div>
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md border border-border bg-background/80 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <QrCode className="size-3" /> {prop.serial_number}
        </span>
      </div>

      <div className="space-y-3 p-4">
        <h3 className="font-display text-xl leading-tight tracking-wide text-foreground">{prop.title}</h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{prop.description}</p>
        {prop.description_specs && (
          <div className="rounded-lg border border-border bg-secondary/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              Configuration / Dimensions
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{prop.description_specs}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {prop.genre_tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        <ConditionBadge condition={prop.condition_rating} />
        {(prop.godown_name || prop.rack_name) && (
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-3 text-primary" />
            {[prop.godown_name, prop.rack_name].filter(Boolean).join(" · ")}
          </p>
        )}
        <div className="grid gap-2">
          <Button className="w-full" disabled={!rentable} onClick={() => onRent(prop)}>
            {rentable ? "Request Rental Quote" : `Unavailable — ${prop.status}`}
          </Button>
          {rentable && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => add(prop.id, prop.title)}
              aria-label={`Add ${prop.title} to shoot wishlist`}
            >
              {inList ? <Check className="size-4" /> : <Plus className="size-4" />}
              {inList ? "Added to Wishlist" : "Add to Shoot Wishlist"}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}