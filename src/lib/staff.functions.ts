import { createServerFn } from "@tanstack/react-start";
import type { ExpenseCategory, StaffRole } from "./staff-types";

const db = () => import("./staff.server");
const admin = () => import("./inventory.server");

/* ---------- staff auth ---------- */

export const staffSessionFn = createServerFn({ method: "GET" }).handler(async () =>
  (await db()).currentStaff(),
);

export const staffSignInFn = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => (await db()).staffSignIn(data));

export const staffSignOutFn = createServerFn({ method: "POST" }).handler(async () =>
  (await db()).staffSignOut(),
);

/* ---------- manager: staff accounts ---------- */

export const listStaffFn = createServerFn({ method: "GET" }).handler(async () => {
  await (await admin()).assertAdmin();
  return (await db()).listStaff();
});

export const createStaffFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      full_name: string;
      phone: string;
      staff_role: StaffRole;
      username: string;
      password: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await (await admin()).assertAdmin();
    return (await db()).createStaff(data);
  });

export const setStaffActiveFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number; active: boolean }) => data)
  .handler(async ({ data }) => {
    await (await admin()).assertAdmin();
    return (await db()).setStaffActive(data);
  });

export const resetStaffPasswordFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number; password: string }) => data)
  .handler(async ({ data }) => {
    await (await admin()).assertAdmin();
    return (await db()).resetStaffPassword(data);
  });

export const deleteStaffFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    await (await admin()).assertAdmin();
    return (await db()).deleteStaff(data.id);
  });

export const assignStaffFn = createServerFn({ method: "POST" })
  .inputValidator((data: { quote_id: number; staff_id: number | null }) => data)
  .handler(async ({ data }) => {
    await (await admin()).assertAdmin();
    return (await db()).assignStaffToQuote(data);
  });

/* ---------- field operations ---------- */

export const fieldAssignmentsFn = createServerFn({ method: "GET" }).handler(async () =>
  (await db()).listFieldAssignments(),
);

export const uploadFieldPhotoFn = createServerFn({ method: "POST" })
  .inputValidator((data: { fileName: string; contentType: string; base64: string }) => data)
  .handler(async ({ data }) => (await db()).uploadFieldPhoto(data));

export const logDispatchFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      quote_id: number;
      kind: "dispatch" | "return";
      vehicle_number: string;
      photo_path?: string | null;
      notes?: string;
    }) => data,
  )
  .handler(async ({ data }) => (await db()).logDispatch(data));

export const reportDamageFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      quote_id: number;
      prop_id?: number | null;
      prop_name: string;
      severity: "minor" | "major" | "lost";
      description: string;
      photo_path?: string | null;
    }) => data,
  )
  .handler(async ({ data }) => (await db()).reportDamage(data));

/* ---------- logs (staff sees own portal, manager sees all) ---------- */

export const dispatchLogsFn = createServerFn({ method: "GET" }).handler(async () => {
  const layer = await db();
  const me = await layer.currentStaff();
  if (!me) await (await admin()).assertAdmin();
  return layer.listDispatchLogs();
});

export const damageReportsFn = createServerFn({ method: "GET" }).handler(async () => {
  const layer = await db();
  const me = await layer.currentStaff();
  if (!me) await (await admin()).assertAdmin();
  return layer.listDamageReports();
});

export const resolveDamageFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    await (await admin()).assertAdmin();
    return (await db()).resolveDamageReport(data.id);
  });

/* ---------- expenses + executive KPI (manager only) ---------- */

export const listExpensesFn = createServerFn({ method: "GET" }).handler(async () => {
  await (await admin()).assertAdmin();
  return (await db()).listExpenses();
});

export const addExpenseFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      category: ExpenseCategory;
      amount: number;
      description: string;
      spent_on: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await (await admin()).assertAdmin();
    return (await db()).addExpense(data);
  });

export const deleteExpenseFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    await (await admin()).assertAdmin();
    return (await db()).deleteExpense(data.id);
  });

export const executiveKpiFn = createServerFn({ method: "GET" }).handler(async () => {
  const layer = await db();
  const me = await layer.currentStaff();
  if (!me) await (await admin()).assertAdmin();
  return layer.executiveKpi();
});
