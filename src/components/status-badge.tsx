import { cn } from "@/lib/utils";
import type { DepositStatus, PropCondition, PropStatus, RentalStatus } from "@/lib/types";

const base =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider";

const tone = {
  gold: "border-primary/40 bg-primary/10 text-primary",
  amber: "border-amber-neon/40 bg-amber-neon/10 text-amber-neon",
  green: "border-success/40 bg-success/10 text-success",
  red: "border-destructive/45 bg-destructive/12 text-destructive",
  muted: "border-border bg-secondary text-muted-foreground",
} as const;

const stockTone: Record<PropStatus, keyof typeof tone> = {
  "In-Stock": "green",
  "On-Set": "amber",
  Booked: "gold",
  Maintenance: "muted",
};

const rentalTone: Record<RentalStatus, keyof typeof tone> = {
  Reserved: "gold",
  "On-Set": "amber",
  Returned: "green",
  Inspecting: "muted",
  Overdue: "red",
  Damaged: "red",
};

const depositTone: Record<DepositStatus, keyof typeof tone> = {
  Held: "gold",
  "Partially Refunded": "amber",
  Refunded: "green",
  Forfeited: "red",
};

export function StockBadge({ status, className }: { status: PropStatus; className?: string }) {
  return (
    <span className={cn(base, tone[stockTone[status]], className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}

export function RentalStatusBadge({ status }: { status: RentalStatus }) {
  return <span className={cn(base, tone[rentalTone[status]])}>{status}</span>;
}

export function DepositBadge({ status }: { status: DepositStatus }) {
  return <span className={cn(base, tone[depositTone[status]])}>{status}</span>;
}

export function ConditionBadge({ condition }: { condition: PropCondition }) {
  const map: Record<PropCondition, keyof typeof tone> = {
    Mint: "green",
    Good: "gold",
    "Distressed/Vintage": "amber",
    "Needs Maintenance": "red",
  };
  return <span className={cn(base, tone[map[condition]])}>{condition}</span>;
}