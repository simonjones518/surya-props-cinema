// Server-only data layer for multi-company (sister concern) letterheads.
//
// Profiles and per-document profile selections are stored as JSON sidecar rows
// in `dispatch_logs` (kind = 'company_profile' / 'doc_profile'), which keeps the
// feature schema-free while remaining fully persistent.
import { suryaDb } from "./surya-supabase.server";
import {
  DEFAULT_COMPANY_PROFILE,
  type CompanyProfile,
  type CompanyProfileDraft,
} from "./company-profiles";

const BUCKET = "prop-images";
const SIGNED_TTL = 60 * 60 * 24 * 7;
const KIND = "company_profile";
const DOC_KIND = "doc_profile";

async function signOne(path: string | null | undefined): Promise<string> {
  if (!path) return "";
  if (/^(https?:)?\/\//.test(path) || path.startsWith("/") || path.startsWith("data:")) return path;
  const { data } = await suryaDb.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl ?? "";
}

function parse(row: Record<string, any>): CompanyProfileDraft & { id: number } {
  let json: Partial<CompanyProfileDraft> = {};
  try {
    json = JSON.parse(row["notes"] ?? "{}");
  } catch {
    json = {};
  }
  return {
    ...DEFAULT_COMPANY_PROFILE,
    ...json,
    id: Number(row["id"]),
    is_default: Boolean(json.is_default),
  } as CompanyProfileDraft & { id: number };
}

export async function listCompanyProfiles(): Promise<CompanyProfile[]> {
  const { data, error } = await suryaDb
    .from("dispatch_logs")
    .select("*")
    .eq("kind", KIND)
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map(parse);
  if (rows.length === 0) return [DEFAULT_COMPANY_PROFILE];
  const profiles = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      logo_url: await signOne(r.logo_url),
      qr_url: await signOne(r.qr_url),
      signature_url: await signOne(r.signature_url),
    })),
  );
  if (!profiles.some((p) => p.is_default) && profiles[0]) profiles[0].is_default = true;
  return profiles as CompanyProfile[];
}

export async function saveCompanyProfile(
  id: number | null,
  draft: CompanyProfileDraft,
): Promise<{ ok: true }> {
  const payload = { notes: JSON.stringify(draft), kind: KIND, quote_code: draft.name.slice(0, 80) };
  if (id && id > 0) {
    const { error } = await suryaDb.from("dispatch_logs").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await suryaDb.from("dispatch_logs").insert(payload);
    if (error) throw new Error(error.message);
  }
  if (draft.is_default) await clearOtherDefaults(id);
  return { ok: true as const };
}

async function clearOtherDefaults(keepId: number | null) {
  const { data } = await suryaDb.from("dispatch_logs").select("*").eq("kind", KIND);
  for (const row of data ?? []) {
    const rowId = Number((row as Record<string, any>)["id"]);
    if (keepId && rowId === keepId) continue;
    const profile = parse(row as Record<string, any>);
    if (!profile.is_default) continue;
    const { id: _drop, ...rest } = profile;
    await suryaDb
      .from("dispatch_logs")
      .update({ notes: JSON.stringify({ ...rest, is_default: false }) })
      .eq("id", rowId);
  }
}

export async function setDefaultCompanyProfile(id: number): Promise<{ ok: true }> {
  const { data, error } = await suryaDb.from("dispatch_logs").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  const { id: _drop, ...rest } = parse(data as Record<string, any>);
  await suryaDb
    .from("dispatch_logs")
    .update({ notes: JSON.stringify({ ...rest, is_default: true }) })
    .eq("id", id);
  await clearOtherDefaults(id);
  return { ok: true as const };
}

export async function deleteCompanyProfile(id: number): Promise<{ ok: true }> {
  const { error } = await suryaDb.from("dispatch_logs").delete().eq("id", id).eq("kind", KIND);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function uploadCompanyAsset(
  fileName: string,
  contentType: string,
  base64: string,
): Promise<{ path: string; preview: string }> {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `company/${Date.now()}-${safe}`;
  const { error } = await suryaDb.storage.from(BUCKET).upload(path, bytes, { contentType });
  if (error) throw new Error(error.message);
  return { path, preview: await signOne(path) };
}

/* ---------- per-document profile selection ---------- */

export async function listDocumentProfiles(): Promise<Record<string, number>> {
  const { data, error } = await suryaDb
    .from("dispatch_logs")
    .select("quote_code, notes")
    .eq("kind", DOC_KIND);
  if (error) throw new Error(error.message);
  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    const ref = (row as Record<string, any>)["quote_code"];
    const value = Number((row as Record<string, any>)["notes"]);
    if (ref && Number.isFinite(value)) map[String(ref)] = value;
  }
  return map;
}

export async function setDocumentProfile(ref: string, profileId: number): Promise<{ ok: true }> {
  await suryaDb.from("dispatch_logs").delete().eq("kind", DOC_KIND).eq("quote_code", ref);
  const { error } = await suryaDb
    .from("dispatch_logs")
    .insert({ kind: DOC_KIND, quote_code: ref, notes: String(profileId) });
  if (error) throw new Error(error.message);
  return { ok: true as const };
}
