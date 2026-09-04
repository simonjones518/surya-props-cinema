import { createServerFn } from "@tanstack/react-start";
import type { CompanyProfileDraft } from "./company-profiles";

const db = () => import("./company-profiles.server");
const gate = () => import("./inventory.server");

/** Reads are open — the letterhead is printed on documents clients receive. */
export const fetchCompanyProfiles = createServerFn({ method: "GET" }).handler(async () =>
  (await db()).listCompanyProfiles(),
);

export const fetchDocumentProfiles = createServerFn({ method: "GET" }).handler(async () =>
  (await db()).listDocumentProfiles(),
);

export const saveCompanyProfileFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number | null; draft: CompanyProfileDraft }) => data)
  .handler(async ({ data }) => {
    await (await gate()).assertAdmin();
    return (await db()).saveCompanyProfile(data.id, data.draft);
  });

export const deleteCompanyProfileFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    await (await gate()).assertAdmin();
    return (await db()).deleteCompanyProfile(data.id);
  });

export const setDefaultCompanyProfileFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    await (await gate()).assertAdmin();
    return (await db()).setDefaultCompanyProfile(data.id);
  });

export const uploadCompanyAssetFn = createServerFn({ method: "POST" })
  .inputValidator((data: { fileName: string; contentType: string; base64: string }) => data)
  .handler(async ({ data }) => {
    await (await gate()).assertAdmin();
    return (await db()).uploadCompanyAsset(data.fileName, data.contentType, data.base64);
  });

export const setDocumentProfileFn = createServerFn({ method: "POST" })
  .inputValidator((data: { ref: string; profileId: number }) => data)
  .handler(async ({ data }) => (await db()).setDocumentProfile(data.ref, data.profileId));
