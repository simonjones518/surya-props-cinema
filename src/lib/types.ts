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
  /** Mandatory technical specs / dimensions printed on every invoice line. */
  description_specs: string;
  godown_id: number | null;
  rack_id: number | null;
  godown_name: string;
  rack_name: string;
}

export interface Godown {
  id: number;
  name: string;
  location_code: string;
}

export interface Rack {
  id: number;
  godown_id: number;
  rack_name: string;
}

/* ---------- rental orders: estimate → actual return settlement ---------- */

export type OrderStatus = "Estimated/On-Set" | "Returned & Settled" | "Cancelled";

export interface RentalOrderItem {
  prop_id: number;
  prop_name: string;
  prop_description: string;
  serial_number: string;
  quantity: number;
  manual_daily_rate: number;
  estimated_days: number;
  actual_days_used: number | null;
  line_total: number;
}

export interface RentalOrder {
  id: number;
  order_number: string;
  client_name: string;
  production_house: string;
  phone_number: string;
  shoot_location: string;
  dispatch_date: string;
  estimated_return_date: string;
  actual_return_date: string | null;
  estimated_days: number;
  actual_days_used: number | null;
  advance_received: number;
  security_deposit: number;
  estimated_total: number;
  total_final_amount: number;
  balance_payable: number;
  order_status: OrderStatus;
  items: RentalOrderItem[];
  notes?: string | null;
  created_at: string;
}

export interface RentalOrderDraft {
  client_name: string;
  production_house: string;
  phone_number: string;
  shoot_location: string;
  dispatch_date: string;
  estimated_return_date: string;
  estimated_days: number;
  advance_received: number;
  security_deposit: number;
  notes?: string;
  items: Omit<RentalOrderItem, "actual_days_used" | "line_total">[];
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
  overdue_rentals: number;
  advances_collected: number;
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

/* ---------- Billing engine ---------- */

export type DocType = "INVOICE" | "QUOTATION";
export type PaymentStatus = "Paid" | "Partial" | "Pending";

export interface InvoiceLineItem {
  prop_id: number;
  prop_name: string;
  serial_number: string;
  condition_rating: PropCondition;
  quantity: number;
  number_of_days: number;
  custom_daily_rate: number;
  total_price: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  doc_type: DocType;
  client_id: number;
  client_name: string;
  client_phone: string;
  production_house: string;
  shoot_location?: string;
  shoot_start_date: string;
  shoot_wrap_date: string;
  items: InvoiceLineItem[];
  subtotal: number;
  discount: number;
  transport_charges: number;
  gst_percent: number;
  gst_amount: number;
  security_deposit: number;
  advance_received: number;
  balance_payable: number;
  payment_status: PaymentStatus;
  notes?: string;
  created_at: string;
}

export type InvoiceDraft = Omit<Invoice, "id" | "created_at">;

export interface ClientDraft {
  production_house: string;
  contact_person: string;
  phone: string;
  email?: string;
  gst_number?: string;
  address?: string;
}

export interface CartLine {
  prop_id: number;
  prop_name: string;
  serial_number: string;
  condition_rating: PropCondition;
  base_daily_rate: number;
  custom_daily_rate: number;
  quantity: number;
}
/* ---------- customer prop requests ---------- */

export type RequestType = "Catalog" | "Custom";
export type RequestStatus = "New" | "Contacted" | "Quoted" | "Fulfilled" | "Rejected";

export interface PropRequest {
  id: number;
  request_code: string;
  request_type: RequestType;
  prop_id: number | null;
  prop_title: string;
  custom_description: string;
  reference_image_urls: string[];
  production_house: string;
  contact_person: string;
  phone: string;
  shoot_location: string;
  shoot_start_date: string | null;
  shoot_wrap_date: string | null;
  quantity: number;
  notes?: string | null;
  status: RequestStatus;
  created_at: string;
}

export interface PropRequestDraft {
  request_type: RequestType;
  prop_id?: number | null;
  prop_title: string;
  custom_description?: string;
  reference_image_urls?: string[];
  production_house: string;
  contact_person: string;
  phone: string;
  shoot_location?: string;
  shoot_start_date?: string | null;
  shoot_wrap_date?: string | null;
  quantity?: number;
  notes?: string | null;
}

/* ---------- client portal: quote lifecycle ---------- */

export type QuoteStatus =
  | "quote_requested"
  | "quote_sent"
  | "advance_submitted"
  | "on_set"
  | "settled"
  | "rejected";

export interface QuoteItem {
  prop_id: number;
  prop_name: string;
  /** Snapshot of technical specs / dimensions at request time. */
  prop_specs: string;
  serial_number: string;
  godown_name: string;
  rack_name: string;
  quantity: number;
  /** Set by the admin during review; 0 until priced. */
  daily_rate: number;
  line_total: number;
}

export interface ClientProfile {
  user_id: string;
  email: string;
  production_house: string;
  contact_person: string;
  phone: string;
  designation: string;
  address: string;
}

/** A film banner / production company. Any client can create new ones on the fly. */
export interface ProductionHouse {
  id: number;
  name: string;
}

export interface QuotePayment {
  id: number;
  quote_id: number;
  kind: "advance" | "security_deposit" | "settlement";
  amount: number;
  reference: string;
  status: "pending" | "verified";
  created_at: string;
}

export interface QuoteRequest {
  id: number;
  quote_code: string;
  user_id: string;
  production_house: string;
  production_house_id: number | null;
  movie_name: string;
  client_designation: string;
  contact_person: string;
  phone: string;
  shoot_location: string;
  shoot_start_date: string;
  estimated_return_date: string;
  estimated_days: number;
  actual_return_date: string | null;
  actual_days_used: number | null;
  items: QuoteItem[];
  estimated_total: number;
  security_deposit: number;
  advance_required: number;
  advance_paid: number;
  final_total: number;
  balance_due: number;
  status: QuoteStatus;
  payment_reference: string | null;
  payment_proof_url: string | null;
  admin_notes: string | null;
  client_notes: string | null;
  created_at: string;
}

export interface QuoteRequestDraft {
  production_house: string;
  movie_name: string;
  shoot_location: string;
  shoot_start_date: string;
  estimated_return_date: string;
  client_notes?: string;
  items: { prop_id: number; quantity: number }[];
}
