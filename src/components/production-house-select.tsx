import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { portal, portalKeys } from "@/lib/portal-api";

/**
 * Searchable production-house combobox. Any industry client can pick an existing
 * banner or add a brand-new one, which is saved to the global banner list.
 */
export function ProductionHouseSelect({
  value,
  onChange,
  id = "banner",
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const houses = useQuery({
    queryKey: portalKeys.productionHouses,
    queryFn: portal.getProductionHouses,
  });

  const options = useMemo(() => (houses.data ?? []).map((h) => h.name), [houses.data]);
  const typed = term.trim();
  const canAdd =
    typed.length > 1 && !options.some((o) => o.toLowerCase() === typed.toLowerCase());

  function pick(name: string) {
    onChange(name);
    setOpen(false);
    setTerm("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={value ? "" : "text-muted-foreground"}>
            {value || "Search production house…"}
          </span>
          <ChevronsUpDown className="size-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] border-primary/25 bg-card p-0">
        <Command shouldFilter>
          <CommandInput
            placeholder="Search or type a new banner…"
            value={term}
            onValueChange={setTerm}
          />
          <CommandList>
            <CommandEmpty className="p-3 text-xs text-muted-foreground">
              No banner matches — add it below.
            </CommandEmpty>
            <CommandGroup>
              {options.map((name) => (
                <CommandItem key={name} value={name} onSelect={() => pick(name)}>
                  <Check
                    className={`size-4 ${value === name ? "opacity-100 text-primary" : "opacity-0"}`}
                  />
                  {name}
                </CommandItem>
              ))}
            </CommandGroup>
            {canAdd && (
              <CommandGroup heading="Add new">
                <CommandItem value={`__add_${typed}`} onSelect={() => pick(typed)}>
                  <Plus className="size-4 text-primary" />
                  Other — add “{typed}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}