import { Check, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockBadge } from "@/components/status-badge";
import { useWishlist } from "@/lib/wishlist";
import type { Prop } from "@/lib/types";

/** Compact, touch-first prop tile used on the mobile catalog and home screens. */
export function PropCardMobile({ prop, onRent }: { prop: Prop; onRent: (prop: Prop) => void }) {
  const rentable = prop.status === "In-Stock";
  const { add, lines } = useWishlist();
  const inList = lines.some((l) => l.prop_id === prop.id);

  return (
    <article className="overflow-hidden rounded-2xl border border-primary/20 bg-card">
      <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
        <div className="relative aspect-square">
          <img
            src={prop.image_urls[0]}
            alt={prop.title}
            loading="lazy"
            className="size-full object-cover"
          />
          <span className="absolute left-1.5 top-1.5 scale-90 origin-top-left">
            <StockBadge status={prop.status} />
          </span>
        </div>
        <div className="min-w-0 py-3 pr-3">
          <h3 className="truncate font-display text-lg leading-tight tracking-wide">{prop.title}</h3>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {prop.serial_number}
          </p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
            {prop.description_specs || prop.description}
          </p>
          {(prop.godown_name || prop.rack_name) && (
            <p className="mt-1.5 flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="size-3 shrink-0 text-primary" />
              <span className="truncate">
                {[prop.godown_name, prop.rack_name].filter(Boolean).join(" · ")}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 pt-0">
        <Button size="sm" disabled={!rentable} onClick={() => onRent(prop)} className="text-xs">
          {rentable ? "Request Quote" : prop.status}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!rentable}
          className="text-xs"
          onClick={() => add(prop.id, prop.title)}
          aria-label={`Add ${prop.title} to shoot wishlist`}
        >
          {inList ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
          {inList ? "Added" : "Wishlist"}
        </Button>
      </div>
    </article>
  );
}
