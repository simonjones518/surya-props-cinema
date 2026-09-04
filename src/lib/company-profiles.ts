import { COMPANY_INFO } from "@/lib/company";
import logoAsset from "@/assets/surya-logo.png.asset.json";
import upiQrAsset from "@/assets/upi-qr.jpeg.asset.json";
import signatureAsset from "@/assets/signature.png.asset.json";

/**
 * A sister-concern letterhead. Every invoice / quotation / challan renders
 * against exactly one profile, and the chosen profile id is persisted per
 * document so historical prints keep the company details used at the time.
 */
export type CompanyProfile = {
  id: number;
  name: string;
  tagline: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  ifsc: string;
  branch: string;
  pan: string;
  upi_id: string;
  upi_phone: string;
  qr_url: string;
  signature_url: string;
  is_default: boolean;
};

export type CompanyProfileDraft = Omit<CompanyProfile, "id">;

/** Built-in fallback so documents never render without a letterhead. */
export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  id: 0,
  name: COMPANY_INFO.name,
  tagline: COMPANY_INFO.tagline,
  logo_url: logoAsset.url,
  address: COMPANY_INFO.warehouse,
  phone: COMPANY_INFO.phone,
  email: COMPANY_INFO.email,
  gstin: "",
  bank_name: "AXIS BANK",
  account_name: COMPANY_INFO.accountName,
  account_number: COMPANY_INFO.accountNumber,
  ifsc: COMPANY_INFO.ifsc,
  branch: "JUBILEEHILLS",
  pan: COMPANY_INFO.pan,
  upi_id: COMPANY_INFO.upiId,
  upi_phone: COMPANY_INFO.upiPhone,
  qr_url: upiQrAsset.url,
  signature_url: signatureAsset.url,
  is_default: true,
};

export const EMPTY_PROFILE_DRAFT: CompanyProfileDraft = {
  name: "",
  tagline: "",
  logo_url: "",
  address: "",
  phone: "",
  email: "",
  gstin: "",
  bank_name: "",
  account_name: "",
  account_number: "",
  ifsc: "",
  branch: "",
  pan: "",
  upi_id: "",
  upi_phone: "",
  qr_url: "",
  signature_url: "",
  is_default: false,
};

/** Resolves the profile a document should render with. */
export function resolveProfile(
  profiles: CompanyProfile[] | undefined,
  id: number | null | undefined,
): CompanyProfile {
  const list = profiles ?? [];
  if (list.length === 0) return DEFAULT_COMPANY_PROFILE;
  const picked = id == null ? undefined : list.find((p) => p.id === id);
  return picked ?? list.find((p) => p.is_default) ?? list[0]!;
}
