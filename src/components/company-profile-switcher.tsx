import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCompanyProfiles,
  fetchDocumentProfiles,
  setDocumentProfileFn,
} from "@/lib/company-profiles.functions";
import { resolveProfile, type CompanyProfile } from "@/lib/company-profiles";

export const companyProfileKeys = {
  profiles: ["company-profiles"] as const,
  docProfiles: ["company-doc-profiles"] as const,
};

/**
 * Resolves (and persists) the company letterhead for one document reference,
 * so a saved invoice or quotation always reprints with the same company.
 */
export function useDocumentProfile(ref: string) {
  const qc = useQueryClient();
  const profiles = useQuery({
    queryKey: companyProfileKeys.profiles,
    queryFn: () => fetchCompanyProfiles() as Promise<CompanyProfile[]>,
    staleTime: 5 * 60 * 1000,
  });
  const docMap = useQuery({
    queryKey: companyProfileKeys.docProfiles,
    queryFn: () => fetchDocumentProfiles() as Promise<Record<string, number>>,
    staleTime: 60 * 1000,
  });

  const selectedId = docMap.data?.[ref] ?? null;
  const profile = resolveProfile(profiles.data, selectedId);

  const select = useMutation({
    mutationFn: (profileId: number) => setDocumentProfileFn({ data: { ref, profileId } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: companyProfileKeys.docProfiles }),
  });

  return {
    profile,
    profiles: profiles.data ?? [],
    selectProfile: (id: number) => select.mutate(id),
  };
}

/** Print-hidden dropdown that swaps the letterhead of the document below it. */
export function CompanyProfileSwitcher({
  profiles,
  value,
  onChange,
}: {
  profiles: CompanyProfile[];
  value: number;
  onChange: (id: number) => void;
}) {
  if (profiles.length < 1) return null;
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground print:hidden">
      Company Profile
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.is_default ? " (default)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
