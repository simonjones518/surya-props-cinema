import { Menu, LogOut, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import {
  ADMIN_GROUPS,
  ADMIN_SECTIONS,
  type AdminSectionKey,
  sectionOf,
} from "@/components/admin/admin-nav";

const MOBILE_TABS: AdminSectionKey[] = ["overview", "quotes", "orders", "inventory"];

/** Sticky mobile top bar: brand + current section + drawer trigger. */
export function AdminMobileHeader({
  active,
  onOpenMenu,
}: {
  active: AdminSectionKey;
  onOpenMenu: () => void;
}) {
  const section = sectionOf(active);
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-card/85 px-4 backdrop-blur-xl lg:hidden print:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <BrandLogo className="h-7 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
            {section.short}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open admin menu"
        className="grid size-9 place-items-center rounded-md border border-border text-muted-foreground"
      >
        <Menu className="size-4" />
      </button>
    </header>
  );
}

/** Bottom tab bar for the four most-used sections on phones. */
export function AdminMobileTabBar({
  active,
  onSelect,
  onOpenMenu,
}: {
  active: AdminSectionKey;
  onSelect: (key: AdminSectionKey) => void;
  onOpenMenu: () => void;
}) {
  return (
    <nav
      aria-label="Admin sections"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden print:hidden"
    >
      {MOBILE_TABS.map((key) => {
        const s = sectionOf(key);
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <s.icon className="size-5" />
            {s.short}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        <Menu className="size-5" />
        More
      </button>
    </nav>
  );
}

/** Full-screen mobile drawer with every section + sign out. */
export function AdminMobileMenu({
  open,
  active,
  onClose,
  onSelect,
  onSignOut,
}: {
  open: boolean;
  active: AdminSectionKey;
  onClose: () => void;
  onSelect: (key: AdminSectionKey) => void;
  onSignOut: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md lg:hidden print:hidden">
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <BrandLogo className="h-7" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="grid size-9 place-items-center rounded-md border border-border text-muted-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {ADMIN_GROUPS.map((group) => {
          const items = ADMIN_SECTIONS.filter((s) => s.group === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              <p className="pb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground/70">
                {group}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      onSelect(item.key);
                      onClose();
                    }}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                      item.key === active
                        ? "border-primary/50 bg-primary/10"
                        : "border-border bg-card"
                    }`}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                      <item.icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{item.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border p-4">
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground"
        >
          <LogOut className="size-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}
