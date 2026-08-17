export const inr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export const inrCompact = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export const shootDays = (start: string, wrap: string) => {
  if (!start || !wrap) return 0;
  const ms = new Date(wrap).getTime() - new Date(start).getTime();
  if (Number.isNaN(ms) || ms < 0) return 0;
  return Math.floor(ms / 86_400_000) + 1;
};

export const prettyDate = (value: string) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
    : "—";

export const nextSerial = (categorySlug: string) => {
  const prefix =
    { weapons: "WPN", "camera-audio": "CAM", vehicles: "VEH", gadgets: "GDT", lighting: "LGT" }[
      categorySlug
    ] ?? "GEN";
  const seq = String(Math.floor(Date.now() / 1000) % 9999).padStart(4, "0");
  return `SCP-${prefix}-${seq}`;
};

export const nextDocNumber = (docType: "INVOICE" | "QUOTATION", sequence?: number) => {
  const year = new Date().getFullYear();
  const seq = sequence ?? (Math.floor(Date.now() / 1000) % 999) + 1;
  return `SCP-${docType === "INVOICE" ? "INV" : "QT"}-${year}-${String(seq).padStart(3, "0")}`;
};

export const addDays = (value: string, days: number) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};