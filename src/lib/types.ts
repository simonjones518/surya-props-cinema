export type PropCondition = "Mint" | "Good" | "Distressed/Vintage" | "Needs Maintenance";
export type PropStatus = "In-Stock" | "On-Set" | "Booked" | "Maintenance";
export type RentalStatus =
  | "Reserved"
  | "On-Set"
  | "Returned"
  | "Inspecting"
  | "Overdue"
  | "Damaged";
export type DepositStatus = "Held" | "Partially Refunded" | "Refunded" | "Forfeited";

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

export interface Prop {
  id: number;
  serial_number: string;
  title: string;
  category_id: number;
  category_slug: string;
  genre_tags: string[];
  daily_rate: number;
  weekly_rate: number;
  security_deposit: number;
  replacement_value: number;
  condition_rating: PropCondition;
  status: PropStatus;
  image_urls: string[];
  video_preview_url?: string;
  description: string;
  qr_code_id: string;
}

export interface Client {
  id: number;
  production_house: string;
  contact_person: string;
  email: string;
  phone: string;
  gst_number?: string;
  address?: string;
}

export interface BookingItem {
  prop_id: number;
  prop_title: string;
  applied_daily_rate: number;
  quantity: number;
}

export interface RentalBooking {
  id: number;
  booking_code: string;
  client_id: number;
  production_house: string;
  start_date: string;
  wrap_date: string;
  items: BookingItem[];
  total_rent: number;
  security_deposit: number;
  advance_paid: number;
  balance_due: number;
  deposit_status: DepositStatus;
  rental_status: RentalStatus;
  notes?: string;
}

export interface KpiAnalytics {
  gross_revenue_today: number;
  net_profit_today: number;
  active_rentals: number;
  on_set_inventory_value: number;
  warehouse_valuation: number;
  outstanding_balances: number;
  held_deposits: number;
  revenue_trend: { label: string; revenue: number; profit: number }[];
}

export interface BookingDraft {
  prop_id: number;
  production_house: string;
  contact_person: string;
  phone: string;
  start_date: string;
  wrap_date: string;
  advance_percent: number;
  total_rent: number;
  security_deposit: number;
  advance_paid: number;
  balance_due: number;
}