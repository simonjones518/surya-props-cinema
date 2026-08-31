/** Client-safe types for the Inventory Staff & Field Operations roles. */

export type StaffRole = "inventory" | "field";

export type StaffAccount = {
  id: number;
  staff_code: string;
  full_name: string;
  phone: string;
  staff_role: StaffRole;
  username: string;
  active: boolean;
  created_at: string;
};

export type StaffSession = {
  id: number;
  full_name: string;
  staff_role: StaffRole;
  staff_code: string;
};

export type DispatchLog = {
  id: number;
  quote_id: number | null;
  quote_code: string;
  kind: "dispatch" | "return";
  vehicle_number: string;
  photo_url: string | null;
  notes: string;
  staff_name: string;
  created_at: string;
};

export type DamageReport = {
  id: number;
  quote_id: number | null;
  quote_code: string;
  prop_id: number | null;
  prop_name: string;
  severity: "minor" | "major" | "lost";
  description: string;
  photo_url: string | null;
  staff_name: string;
  status: "open" | "resolved";
  created_at: string;
};

export type ExpenseCategory = "maintenance" | "transport" | "labor" | "administrative" | "other";

export type Expense = {
  id: number;
  category: ExpenseCategory;
  amount: number;
  description: string;
  spent_on: string;
  created_at: string;
};

export type FieldAssignment = {
  id: number;
  quote_code: string;
  production_house: string;
  movie_name: string;
  contact_person: string;
  phone: string;
  shoot_location: string;
  shoot_start_date: string;
  estimated_return_date: string;
  status: string;
  assigned_staff_name: string | null;
  items: { prop_id: number; prop_name: string; quantity: number; serial_number: string }[];
};
