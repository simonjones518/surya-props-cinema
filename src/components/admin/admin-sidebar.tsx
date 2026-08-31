import { ChevronLeft, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ADMIN_GROUPS, ADMIN_SECTIONS, type AdminSectionKey } from "@/components/admin/admin-nav";

export function AdminSidebar({
  active,
  onSelect,
  collapsed,
  onToggleCollapse,
  onSignOut,
}: {
  active: AdminSectionKey;
  onSelect: (key: AdminSectionKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSignOut: () => void;
}) {
  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card/70 backdrop-blur-xl transition-[width] duration-200 lg:flex ${
        collapsed ? "w-[76px]" : "w-[264px]"
      } print:hidden`}
      aria-label="Admin navigation"
    >
      <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-3">
        {!collapsed && <BrandLogo className="h-8" />}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
        >
          <ChevronLeft className={`size-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
        {ADMIN_GROUPS.map((group) => {
          const items = ADMIN_SECTIONS.filter((s) => s.group === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              {!collapsed && (
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground/70">
                  {group}
                </p>
              )}
              <ul className="space-y-1">
                {items.map((item) => {
                  const isActive = item.key === active;
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => onSelect(item.key)}
                        aria-current={isActive ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                          isActive
                            ? "border border-primary/45 bg-primary/12 font-semibold text-primary"
                            : "border border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                        } ${collapsed ? "justify-center px-0" : ""}`}
                      >
                        <item.icon className="size-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={onSignOut}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
