"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export type TaxFormValues = {
  id: string;
  title: string;
  vat: number;
  active: boolean;
};

export type TaxFormProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit" | "view";
  initial?: Partial<TaxFormValues>;
  onSubmit: (data: TaxFormValues) => void;
};

function safeParseVat(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function TaxFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: TaxFormProps) {
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [vat, setVat] = React.useState<string>(
    initial?.vat != null ? String(initial.vat) : ""
  );
  const [active, setActive] = React.useState(initial?.active ?? true);

  React.useEffect(() => {
    setTitle(initial?.title ?? "");
    setVat(initial?.vat != null ? String(initial.vat) : "");
    setActive(initial?.active ?? true);
  }, [initial, open]);

  const isReadOnly = mode === "view";

  const dialogTitle =
    mode === "create" ? "Add Tax" : mode === "edit" ? "Edit Tax" : "View Tax";

  const helper =
    mode === "create"
      ? "Create a new tax"
      : mode === "edit"
      ? "Update tax information"
      : "Tax details";

  const cta = mode === "create" ? "Create" : "Update";

  const disabled = !title.trim() || vat.trim() === "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{helper}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tax-title">Title *</Label>
            <Input
              id="tax-title"
              placeholder="e.g., Standard VAT"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax-vat">VAT *</Label>
            <Input
              id="tax-vat"
              placeholder="e.g., 15"
              value={vat}
              onChange={(e) => setVat(e.target.value)}
              disabled={isReadOnly}
              inputMode="decimal"
            />
            <p className="text-[11px] text-muted-foreground">
              Enter a numeric VAT percentage (e.g. 15)
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="mb-0">Status</Label>
              <p className="text-xs text-muted-foreground">Is Active</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} disabled={isReadOnly} />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isReadOnly ? "Close" : "Cancel"}
          </Button>
          {!isReadOnly && (
            <Button
              onClick={() => {
                const payload: TaxFormValues = {
                  id: initial?.id ?? "",
                  title: title.trim(),
                  vat: safeParseVat(vat.trim()),
                  active,
                };
                onSubmit(payload);
                onOpenChange(false);
              }}
              disabled={disabled}
            >
              {cta}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
