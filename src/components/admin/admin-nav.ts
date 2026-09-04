import {
  Banknote,
  Boxes,
  ClipboardList,
  FileText,
  Gauge,
  HardHat,
  Inbox,
  Settings,
  Truck,
  UserRound,
  Users,
  Warehouse,
} from "lucide-react";

export type AdminSectionKey =
  | "overview"
  | "quotes"
  | "orders"
  | "warehouse"
  | "pipeline"
  | "requests"
  | "inventory"
  | "billing"
  | "clients"
  | "staff"
  | "field"
  | "finance"
  | "settings";

export type AdminSection = {
  key: AdminSectionKey;
  label: string;
  short: string;
  icon: typeof Gauge;
  group: "Command" | "Operations" | "Warehouse" | "Finance" | "People" | "Settings";
  hint: string;
};

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    key: "overview",
    label: "Dashboard Overview",
    short: "Home",
    icon: Gauge,
    group: "Command",
    hint: "Live KPIs, revenue trend and alerts",
  },
  {
    key: "quotes",
    label: "Quote Approvals",
    short: "Quotes",
    icon: ClipboardList,
    group: "Operations",
    hint: "Price, approve and dispatch client quotes",
  },
  {
    key: "orders",
    label: "Rental Orders & Settlement",
    short: "Orders",
    icon: Truck,
    group: "Operations",
    hint: "Challans, actual return dates and settlement",
  },
  {
    key: "pipeline",
    label: "Rental Pipeline",
    short: "Pipeline",
    icon: Inbox,
    group: "Operations",
    hint: "Booking status transitions and deposits",
  },
  {
    key: "requests",
    label: "Customer Requests",
    short: "Requests",
    icon: Inbox,
    group: "Operations",
    hint: "Catalog and custom prop enquiries",
  },
  {
    key: "inventory",
    label: "Inventory & Stock",
    short: "Stock",
    icon: Boxes,
    group: "Warehouse",
    hint: "Props master, condition and status",
  },
  {
    key: "warehouse",
    label: "Warehouse Matrix",
    short: "Godowns",
    icon: Warehouse,
    group: "Warehouse",
    hint: "Godown / rack occupancy grid",
  },
  {
    key: "billing",
    label: "Invoices & Quotations",
    short: "Billing",
    icon: FileText,
    group: "Finance",
    hint: "All documents, direct invoicing",
  },
  {
    key: "finance",
    label: "Finance & Expenses",
    short: "Finance",
    icon: Banknote,
    group: "Finance",
    hint: "Expense ledger and profitability",
  },
  {
    key: "clients",
    label: "Client Profiles",
    short: "Clients",
    icon: UserRound,
    group: "People",
    hint: "Registered clients, service history and money received",
  },
  {
    key: "staff",
    label: "Staff & Roles",
    short: "Staff",
    icon: Users,
    group: "People",
    hint: "Inventory staff and field workers",
  },
  {
    key: "field",
    label: "Field Operations",
    short: "Field",
    icon: HardHat,
    group: "People",
    hint: "Dispatch logs and damage reports",
  },
  {
    key: "settings",
    label: "Settings",
    short: "Settings",
    icon: Settings,
    group: "Settings",
    hint: "Company profiles, prop categories, bank and UPI details",
  },
];

export const ADMIN_GROUPS = [
  "Command",
  "Operations",
  "Warehouse",
  "Finance",
  "People",
  "Settings",
] as const;

export const sectionOf = (key: AdminSectionKey) =>
  ADMIN_SECTIONS.find((s) => s.key === key) ?? ADMIN_SECTIONS[0]!;
