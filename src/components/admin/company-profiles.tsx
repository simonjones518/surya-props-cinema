import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteCompanyProfileFn,
  fetchCompanyProfiles,
  saveCompanyProfileFn,
  setDefaultCompanyProfileFn,
  uploadCompanyAssetFn,
} from "@/lib/company-profiles.functions";
import {
  EMPTY_PROFILE_DRAFT,
  type CompanyProfile,
  type CompanyProfileDraft,
} from "@/lib/company-profiles";
import { companyProfileKeys } from "@/components/company-profile-switcher";

async function toBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

/** Settings › Company Profiles — manage sister-concern letterheads. */
export function CompanyProfiles() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ id: number | null; draft: CompanyProfileDraft } | null>(
    null,
  );

  const profiles = useQuery({
    queryKey: companyProfileKeys.profiles,
    queryFn: () => fetchCompanyProfiles() as Promise<CompanyProfile[]>,
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: companyProfileKeys.profiles });
  };

  const save = useMutation({
    mutationFn: (payload: { id: number | null; draft: CompanyProfileDraft }) =>
      saveCompanyProfileFn({ data: payload }),
    onSuccess: () => {
      refresh();
      setEditing(null);
      toast.success("Company profile saved");
    },
    onError: (e: Error) => toast.error("Could not save profile", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteCompanyProfileFn({ data: { id } }),
    onSuccess: () => {
      refresh();
      toast.success("Company profile deleted");
    },
    onError: (e: Error) => toast.error("Could not delete", { description: e.message }),
  });

  const makeDefault = useMutation({
    mutationFn: (id: number) => setDefaultCompanyProfileFn({ data: { id } }),
    onSuccess: () => {
      refresh();
      toast.success("Default company profile updated");
    },
    onError: (e: Error) => toast.error("Could not update default", { description: e.message }),
  });

  const upload = async (file: File, field: "logo_url" | "qr_url" | "signature_url") => {
    try {
      const res = await uploadCompanyAssetFn({
        data: {
          fileName: file.name,
          contentType: file.type || "image/png",
          base64: await toBase64(file),
        },
      });
      setEditing((prev) => (prev ? { ...prev, draft: { ...prev.draft, [field]: res.path } } : prev));
      toast.success("Image uploaded");
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message });
    }
  };

  const list = profiles.data ?? [];

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl tracking-wide">Company Profiles</h2>
          <p className="text-xs text-muted-foreground">
            Multiple sister concerns — pick the letterhead per invoice or quotation.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing({ id: null, draft: { ...EMPTY_PROFILE_DRAFT } })}>
          <Plus className="size-4" /> Add Company Profile
        </Button>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((p) => (
          <article key={p.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold">
                  {p.name}
                  {p.is_default && (
                    <span className="rounded bg-primary/15 px-1.5 py-px text-[10px] uppercase tracking-wider text-primary">
                      Default
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{p.address}</p>
                <p className="text-xs text-muted-foreground">
                  {p.phone} · {p.email}
                  {p.gstin ? ` · GSTIN ${p.gstin}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.bank_name} · A/C {p.account_number} · IFSC {p.ifsc}
                </p>
                <p className="text-xs text-muted-foreground">UPI {p.upi_id}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {p.logo_url && (
                  <img src={p.logo_url} alt={`${p.name} logo`} className="h-10 w-auto object-contain" />
                )}
                {p.signature_url && (
                  <img
                    src={p.signature_url}
                    alt="Authorised signature"
                    className="h-8 w-auto object-contain"
                  />
                )}
                {p.qr_url && (
                  <img src={p.qr_url} alt="UPI QR" className="size-12 rounded bg-white object-contain p-0.5" />
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const { id: _id, ...draft } = p;
                  setEditing({ id: p.id > 0 ? p.id : null, draft });
                }}
              >
                <Pencil className="size-3.5" /> Edit
              </Button>
              {!p.is_default && p.id > 0 && (
                <Button size="sm" variant="outline" onClick={() => makeDefault.mutate(p.id)}>
                  <BadgeCheck className="size-3.5" /> Make Default
                </Button>
              )}
              {p.id > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => remove.mutate(p.id)}
                >
                  <Trash2 className="size-3.5" /> Delete
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Company Profile" : "New Company Profile"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldInput
                label="Company Name"
                value={editing.draft.name}
                onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, name: v } })}
              />
              <FieldInput
                label="Tagline"
                value={editing.draft.tagline}
                onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, tagline: v } })}
              />
              <div className="sm:col-span-2">
                <FieldInput
                  label="Address"
                  value={editing.draft.address}
                  onChange={(v) =>
                    setEditing({ ...editing, draft: { ...editing.draft, address: v } })
                  }
                />
              </div>
              <FieldInput
                label="Phone"
                value={editing.draft.phone}
                onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, phone: v } })}
              />
              <FieldInput
                label="Email"
                value={editing.draft.email}
                onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, email: v } })}
              />
              <FieldInput
                label="GSTIN (optional)"
                value={editing.draft.gstin}
                onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, gstin: v } })}
              />
              <FieldInput
                label="PAN"
                value={editing.draft.pan}
                onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, pan: v } })}
              />
              <FieldInput
                label="Bank Name"
                value={editing.draft.bank_name}
                onChange={(v) =>
                  setEditing({ ...editing, draft: { ...editing.draft, bank_name: v } })
                }
              />
              <FieldInput
                label="Account Holder Name"
                value={editing.draft.account_name}
                onChange={(v) =>
                  setEditing({ ...editing, draft: { ...editing.draft, account_name: v } })
                }
              />
              <FieldInput
                label="Account Number"
                value={editing.draft.account_number}
                onChange={(v) =>
                  setEditing({ ...editing, draft: { ...editing.draft, account_number: v } })
                }
              />
              <FieldInput
                label="IFSC Code"
                value={editing.draft.ifsc}
                onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, ifsc: v } })}
              />
              <FieldInput
                label="Branch"
                value={editing.draft.branch}
                onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, branch: v } })}
              />
              <FieldInput
                label="UPI ID"
                value={editing.draft.upi_id}
                onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, upi_id: v } })}
              />
              <FieldInput
                label="GPay / PhonePe Number"
                value={editing.draft.upi_phone}
                onChange={(v) =>
                  setEditing({ ...editing, draft: { ...editing.draft, upi_phone: v } })
                }
              />
              <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
                <AssetField
                  label="Company Logo"
                  value={editing.draft.logo_url}
                  onUrl={(v) =>
                    setEditing({ ...editing, draft: { ...editing.draft, logo_url: v } })
                  }
                  onFile={(f) => void upload(f, "logo_url")}
                />
                <AssetField
                  label="UPI QR Code"
                  value={editing.draft.qr_url}
                  onUrl={(v) => setEditing({ ...editing, draft: { ...editing.draft, qr_url: v } })}
                  onFile={(f) => void upload(f, "qr_url")}
                />
                <AssetField
                  label="Authorised Signature"
                  value={editing.draft.signature_url}
                  onUrl={(v) =>
                    setEditing({ ...editing, draft: { ...editing.draft, signature_url: v } })
                  }
                  onFile={(f) => void upload(f, "signature_url")}
                />
              </div>
              <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.draft.is_default}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, is_default: e.target.checked },
                    })
                  }
                  className="size-4 accent-primary"
                />
                Use as the default company profile
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editing?.draft.name || save.isPending}
              onClick={() => editing && save.mutate(editing)}
            >
              Save Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function FieldInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function AssetField({
  label,
  value,
  onUrl,
  onFile,
}: {
  label: string;
  value: string;
  onUrl: (v: string) => void;
  onFile: (f: File) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label} (upload or paste URL)</Label>
      <Input value={value} onChange={(e) => onUrl(e.target.value)} placeholder="https://…" />
      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-primary">
        <Upload className="size-3.5" /> Upload image
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </label>
    </div>
  );
}
