import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, queryKeys } from "@/lib/api";
import { inr } from "@/lib/format";
import { readClientIssued, writeClientIssued, isInvoiceLocked } from "@/lib/invoice-settlement";
import type { Invoice } from "@/lib/types";

/**
 * Records the amount the client finally agreed to pay on a saved billing
 * record, plus the concession we absorbed. Marking it received closes the
 * ticket: the record becomes read-only.
 */
export function InvoiceSettleDialog({
  invoice,
  onOpenChange,
}: {
  invoice: Invoice | null;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const locked = invoice ? isInvoiceLocked(invoice.payment_status) : false;
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (!invoice) return;
    const { amount: saved } = readClientIssued(invoice.notes);
    setAmount(saved ?? invoice.balance_payable);
  }, [invoice]);

  const concession = invoice ? Math.max(0, invoice.balance_payable - amount) : 0;

  const save = useMutation({
    mutationFn: async ({ close }: { close: boolean }) => {
      if (!invoice) throw new Error("No record selected");
      const notes = writeClientIssued(invoice.notes, amount);
      const payment_status: Invoice["payment_status"] = close
        ? "Paid"
        : amount > 0 && amount < invoice.balance_payable
          ? "Partial"
          : invoice.payment_status;
      await api.updateInvoice(invoice.id, { notes, payment_status });
      return { notes, payment_status };
    },
    onSuccess: (res, vars) => {
      qc.setQueryData<Invoice[]>(queryKeys.invoices, (old) =>
        (old ?? []).map((v) =>
          v.id === invoice?.id ? { ...v, notes: res.notes, payment_status: res.payment_status } : v,
        ),
      );
      void qc.invalidateQueries({ queryKey: queryKeys.invoices });
      toast.success(
        vars.close ? "Payment received — record closed and locked" : "Client-issued amount saved",
      );
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Could not save", { description: e.message }),
  });

  return (
    <Dialog open={invoice !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-primary/25 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wide text-gradient-gold">
            Client-Issued Amount
          </DialogTitle>
          <DialogDescription>
            {invoice?.invoice_number} · invoiced balance {inr(invoice?.balance_payable ?? 0)}. Enter
            the negotiated figure the client agreed to pay.
          </DialogDescription>
        </DialogHeader>

        {locked ? (
          <div className="flex items-start gap-2 rounded-lg border border-primary/30 p-3 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              This record is closed and locked. Client issued{" "}
              <strong className="text-primary">
                {inr(readClientIssued(invoice?.notes).amount ?? invoice?.balance_payable ?? 0)}
              </strong>
              .
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="issued-amt">Client issued ₹</Label>
              <Input
                id="issued-amt"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              />
            </div>
            <div className="rounded-lg border border-primary/20 p-3 text-sm">
              <Line label="Invoiced balance" value={inr(invoice?.balance_payable ?? 0)} />
              <Line label="Client issued (receivable)" value={inr(amount)} />
              <Line label="Concession absorbed" value={inr(concession)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={save.isPending}
                onClick={() => save.mutate({ close: false })}
              >
                Save amount
              </Button>
              <Button
                className="flex-1"
                disabled={save.isPending || amount <= 0}
                onClick={() => save.mutate({ close: true })}
              >
                <Lock className="size-4" /> Mark received &amp; close
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Marking it received sets the payment status to Paid and permanently locks this record
              from further edits.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
