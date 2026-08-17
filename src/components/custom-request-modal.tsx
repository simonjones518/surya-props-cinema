import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Loader2, MessageCircle, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { prettyDate } from "@/lib/format";
import { openWhatsApp } from "@/lib/whatsapp";

/** Customer request for a prop that is not in the catalog — photo + description. */
export function CustomRequestModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [productionHouse, setProductionHouse] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [start, setStart] = useState("");
  const [wrap, setWrap] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [images, setImages] = useState<{ path: string; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 6)) {
        const uploaded = await api.uploadRequestImage(file);
        setImages((prev) => [...prev, uploaded].slice(0, 6));
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
      api.createPropRequest({
        request_type: "Custom",
        prop_title: title,
        custom_description: description,
        reference_image_urls: images.map((i) => i.path),
        production_house: productionHouse,
        contact_person: contactPerson,
        phone,
        shoot_start_date: start || null,
        shoot_wrap_date: wrap || null,
        quantity,
      }),
    onSuccess: (res) => {
      const lines = [
        `*Surya Cine Special Props — Custom Prop Request*`,
        `Request: ${res.request_code}`,
        `Prop wanted: ${title} ×${quantity}`,
        `Description: ${description}`,
        productionHouse ? `Production house: ${productionHouse}` : "",
        `Contact: ${contactPerson} — ${phone}`,
        start && wrap ? `Shoot: ${prettyDate(start)} → ${prettyDate(wrap)}` : "",
        images.length
          ? `${images.length} reference photo(s) uploaded — attached in the Admin ERP dashboard.`
          : "",
      ].filter(Boolean);
      openWhatsApp(lines.join("\n"));
      toast.success(`Custom request ${res.request_code} sent`, {
        description: "Saved to our production desk — share the reference photo on WhatsApp too if you like.",
      });
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setImages([]);
    },
    onError: (e: Error) => toast.error("Request failed", { description: e.message }),
  });

  const valid = Boolean(title.trim() && description.trim() && contactPerson.trim() && phone.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-primary/25 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide text-gradient-gold">
            Request a Custom Prop
          </DialogTitle>
          <DialogDescription>
            Not in the catalog? Upload a reference photo and describe it — we source, fabricate or dress it for your
            shoot.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="What prop do you need?">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="1940s brass telescope" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Describe the prop">
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Size, era, finish, colour, how it's used in the scene, any hero close-up needs…"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Reference Photos">
              <div className="flex flex-wrap items-center gap-3">
                {images.map((img) => (
                  <div
                    key={img.path}
                    className="relative size-20 overflow-hidden rounded-lg border border-primary/30"
                  >
                    <img src={img.preview} alt={title || "Reference photo"} className="size-full object-cover" />
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
                <Button type="button" variant="outline" disabled={uploading} onClick={() => fileInput.current?.click()}>
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                  {uploading ? "Uploading…" : "Upload Photo"}
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
            </Field>
          </div>
          <Field label="Production House">
            <Input value={productionHouse} onChange={(e) => setProductionHouse(e.target.value)} placeholder="Vetri Cinemas" />
          </Field>
          <Field label="Your Name">
            <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Line producer" />
          </Field>
          <Field label="WhatsApp / Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98400 00000" />
          </Field>
          <Field label="Quantity">
            <Input
              type="number"
              min={1}
              max={99}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
          <Field label="Shoot Start">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Wrap Date">
            <Input type="date" value={wrap} min={start || undefined} onChange={(e) => setWrap(e.target.value)} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || isPending || uploading} onClick={() => mutate()}>
            <MessageCircle className="size-4" />
            {isPending ? "Sending…" : "Send Custom Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
