import {
  addExpenseFn,
  assignStaffFn,
  createStaffFn,
  damageReportsFn,
  deleteExpenseFn,
  deleteStaffFn,
  dispatchLogsFn,
  executiveKpiFn,
  fieldAssignmentsFn,
  listExpensesFn,
  listStaffFn,
  logDispatchFn,
  reportDamageFn,
  resetStaffPasswordFn,
  resolveDamageFn,
  setStaffActiveFn,
  setStaffDailyWageFn,
  staffSessionFn,
  staffSignInFn,
  staffSignOutFn,
  uploadFieldPhotoFn,
} from "./staff.functions";
import type {
  DamageReport,
  DispatchLog,
  Expense,
  ExpenseCategory,
  FieldAssignment,
  StaffAccount,
  StaffRole,
  StaffSession,
} from "./staff-types";

async function toBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export const staffApi = {
  session: () => staffSessionFn() as Promise<StaffSession | null>,
  signIn: (username: string, password: string) => staffSignInFn({ data: { username, password } }),
  signOut: () => staffSignOutFn(),

  /* manager */
  listStaff: () => listStaffFn() as Promise<StaffAccount[]>,
  createStaff: (data: {
    full_name: string;
    phone: string;
    staff_role: StaffRole;
    daily_wage: number;
    username: string;
    password: string;
  }) => createStaffFn({ data }),
  setActive: (id: number, active: boolean) => setStaffActiveFn({ data: { id, active } }),
  setDailyWage: (id: number, daily_wage: number) =>
    setStaffDailyWageFn({ data: { id, daily_wage } }),
  resetPassword: (id: number, password: string) => resetStaffPasswordFn({ data: { id, password } }),
  deleteStaff: (id: number) => deleteStaffFn({ data: { id } }),
  assignStaff: (quote_id: number, staff_id: number | null) =>
    assignStaffFn({ data: { quote_id, staff_id } }),

  /* field ops */
  assignments: () => fieldAssignmentsFn() as Promise<FieldAssignment[]>,
  uploadPhoto: async (file: File) =>
    uploadFieldPhotoFn({
      data: {
        fileName: file.name,
        contentType: file.type || "image/jpeg",
        base64: await toBase64(file),
      },
    }) as Promise<{ path: string }>,
  logDispatch: (data: {
    quote_id: number;
    kind: "dispatch" | "return";
    vehicle_number: string;
    photo_path?: string | null;
    notes?: string;
  }) => logDispatchFn({ data }),
  reportDamage: (data: {
    quote_id: number;
    prop_id?: number | null;
    prop_name: string;
    severity: "minor" | "major" | "lost";
    description: string;
    photo_path?: string | null;
  }) => reportDamageFn({ data }),

  /* logs */
  dispatchLogs: () => dispatchLogsFn() as Promise<DispatchLog[]>,
  damageReports: () => damageReportsFn() as Promise<DamageReport[]>,
  resolveDamage: (id: number) => resolveDamageFn({ data: { id } }),

  /* finance */
  expenses: () => listExpensesFn() as Promise<Expense[]>,
  addExpense: (data: {
    category: ExpenseCategory;
    amount: number;
    description: string;
    spent_on: string;
  }) => addExpenseFn({ data }),
  deleteExpense: (id: number) => deleteExpenseFn({ data: { id } }),
  kpi: () => executiveKpiFn(),
};

export const staffKeys = {
  session: ["staff-session"] as const,
  staff: ["staff-accounts"] as const,
  assignments: ["field-assignments"] as const,
  dispatchLogs: ["dispatch-logs"] as const,
  damageReports: ["damage-reports"] as const,
  expenses: ["expense-ledger"] as const,
  kpi: ["executive-kpi"] as const,
};

export const EXPENSE_LABEL: Record<ExpenseCategory, string> = {
  maintenance: "Maintenance",
  transport: "Transport",
  labor: "Labour / Worker",
  administrative: "Administrative",
  other: "Other",
};
