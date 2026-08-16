import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { QrCode, RefreshCw } from "lucide-react";
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
import { api } from "@/lib/api";
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
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "weapons");
  const [serial, setSerial] = useState(() => nextSerial("weapons"));
  const [dailyRate, setDailyRate] = useState(3500);
  const [replacement, setReplacement] = useState(150000);
  const [condition, setCondition] = useState<PropCondition>("Mint");
  const [description, setDescription] = useState("");

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
        qr_code_id: `QR-${serial}`,
      }),
    onSuccess: () => {
      toast.success("Prop saved to warehouse", { description: `${serial} · ${title}` });
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
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
          <Button disabled={!title || isPending} onClick={() => mutate()}>
            {isPending ? "Saving…" : "Save Prop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}