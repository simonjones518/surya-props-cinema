import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Loader2, QrCode, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, queryKeys } from "@/lib/api";
import { inr, nextSerial } from "@/lib/format";
import type { Category, PropCondition } from "@/lib/types";

const CONDITIONS: PropCondition[] = ["Mint", "Good", "Distressed/Vintage", "Needs Maintenance"];

export function StockModal({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: Category[];
}) {
  const [title, setTitle] = useState("");
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
  const [serial, setSerial] = useState(() => nextSerial(categories[0]?.slug ?? "prop"));
  const [dailyRate, setDailyRate] = useState(3500);
  const [replacement, setReplacement] = useState(150000);
  const [condition, setCondition] = useState<PropCondition>("Mint");
  const [description, setDescription] = useState("");
  const [specs, setSpecs] = useState("");
  const [godownId, setGodownId] = useState("");
  const [rackId, setRackId] = useState("");
  const [images, setImages] = useState<{ path: string; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  // Categories are managed in Settings → Prop Categories and load asynchronously.
  useEffect(() => {
    if (!categorySlug && categories.length) {
      setCategorySlug(categories[0]!.slug);
      setSerial(nextSerial(categories[0]!.slug));
    }
  }, [categories, categorySlug]);
  const godowns = useQuery({ queryKey: queryKeys.godowns, queryFn: api.getGodowns });
  const racks = useQuery({ queryKey: queryKeys.racks, queryFn: api.getRacks });
  const godownRacks = useMemo(
    () => (racks.data ?? []).filter((r) => String(r.godown_id) === godownId),
    [racks.data, godownId],
  );

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploaded = await api.uploadPropImage(file);
        setImages((prev) => [...prev, uploaded]);
      }
    } catch (e) {
      toast.error("Photo upload failed", { description: (e as Error).message });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.saveProp({
        title,
        serial_number: serial,
        category_slug: categorySlug,
        daily_rate: dailyRate,
        weekly_rate: Math.round(dailyRate * 5.6),
        security_deposit: Math.round(replacement * 0.2),
        replacement_value: replacement,
        condition_rating: condition,
        description,
        description_specs: specs,
        godown_id: godownId ? Number(godownId) : null,
        rack_id: rackId ? Number(rackId) : null,
        image_urls: images.map((i) => i.path),
        qr_code_id: `QR-${serial}`,
      }),
    onSuccess: () => {
      toast.success("Prop saved to warehouse", { description: `${serial} · ${title}` });
      void queryClient.invalidateQueries({ queryKey: queryKeys.props });
      void queryClient.invalidateQueries({ queryKey: queryKeys.kpi });
      setTitle("");
      setDescription("");
      setSpecs("");
      setImages([]);
      setSerial(nextSerial(categorySlug));
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Could not save prop", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto border-primary/25 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide text-gradient-gold">
            Add / Edit Prop
          </DialogTitle>
          <DialogDescription>Warehouse stock entry with auto serial and QR tag.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[1fr_240px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Prop Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="1873 Colt Revolver" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={categorySlug}
                onValueChange={(v) => {
                  setCategorySlug(v);
                  setSerial(nextSerial(v));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categories.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  No categories yet — add them in Settings → Prop Categories.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as PropCondition)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Daily Rate (₹)</Label>
              <Input type="number" value={dailyRate} onChange={(e) => setDailyRate(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Replacement Valuation (₹)</Label>
              <Input type="number" value={replacement} onChange={(e) => setReplacement(Number(e.target.value))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Serial Number</Label>
              <div className="flex gap-2">
                <Input value={serial} onChange={(e) => setSerial(e.target.value)} className="font-mono" />
                <Button type="button" variant="outline" onClick={() => setSerial(nextSerial(categorySlug))}>
                  <RefreshCw className="size-4" /> Generate
                </Button>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Assigned Godown</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  value={godownId}
                  onValueChange={(v) => {
                    setGodownId(v);
                    setRackId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select godown" />
                  </SelectTrigger>
                  <SelectContent>
                    {(godowns.data ?? []).map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={rackId} onValueChange={setRackId} disabled={!godownId}>
                  <SelectTrigger>
                    <SelectValue placeholder={godownId ? "Select rack / bay" : "Pick a godown first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {godownRacks.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.rack_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>
                Technical Specs / Dimensions <span className="text-primary">*</span>
              </Label>
              <Textarea
                value={specs}
                onChange={(e) => setSpecs(e.target.value)}
                rows={3}
                placeholder="Full cage, V-Mount battery plate, Tilta follow focus, Matte Box, 1.2 kg"
              />
              <p className="text-[11px] text-muted-foreground">
                Printed under the item name on every estimate and final invoice.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Photos</Label>
              <div className="flex flex-wrap items-center gap-3">
                {images.map((img) => (
                  <div key={img.path} className="relative size-20 overflow-hidden rounded-lg border border-primary/30">
                    <img src={img.preview} alt={title || "Prop photo"} className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((i) => i.path !== img.path))}
                      className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-background/80 text-foreground"
                      aria-label="Remove photo"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                  {uploading ? "Uploading…" : "Upload Photos"}
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => void handleFiles(e.target.files)}
                />
              </div>
            </div>
          </div>

          <aside className="surface-metal flex flex-col items-center justify-center gap-3 rounded-xl border border-primary/30 p-5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">QR Tag Preview</p>
            <div className="grid size-32 place-items-center rounded-lg border border-primary/40 bg-background">
              <QrCode className="size-24 text-primary" />
            </div>
            <p className="font-mono text-xs text-foreground">QR-{serial}</p>
            <p className="text-[11px] text-muted-foreground">
              Weekly {inr(Math.round(dailyRate * 5.6))} · Deposit {inr(Math.round(replacement * 0.2))}
            </p>
          </aside>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!title || !categorySlug || !specs.trim() || isPending} onClick={() => mutate()}>
            {isPending ? "Saving…" : "Save Prop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}