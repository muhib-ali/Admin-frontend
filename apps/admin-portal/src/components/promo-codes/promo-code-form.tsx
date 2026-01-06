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

export type PromoCodeFormValues = {
  id: string;
  code: string;
  value: number;
  usage_limit: number;
  expires_at: string;
  active: boolean;
};

export type PromoCodeFormProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit" | "view";
  initial?: Partial<PromoCodeFormValues>;
  onSubmit: (data: PromoCodeFormValues) => void;
};

function toDatetimeLocalValue(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(v: string) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

export default function PromoCodeFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: PromoCodeFormProps) {
  const [code, setCode] = React.useState(initial?.code ?? "");
  const [value, setValue] = React.useState<number>(initial?.value ?? 0);
  const [usageLimit, setUsageLimit] = React.useState<number>(
    initial?.usage_limit ?? 1
  );
  const [expiresAt, setExpiresAt] = React.useState<string>(
    initial?.expires_at ?? ""
  );
  const [active, setActive] = React.useState(initial?.active ?? true);

  React.useEffect(() => {
    setCode(initial?.code ?? "");
    setValue(initial?.value ?? 0);
    setUsageLimit(initial?.usage_limit ?? 1);
    setExpiresAt(initial?.expires_at ?? "");
    setActive(initial?.active ?? true);
  }, [initial, open]);

  const title =
    mode === "create"
      ? "Add Promo Code"
      : mode === "edit"
        ? "Edit Promo Code"
        : "View Promo Code";

  const helper =
    mode === "create"
      ? "Create a new promo code"
      : mode === "edit"
        ? "Update promo code information"
        : "Promo code details";

  const cta = mode === "create" ? "Create" : "Update";
  const isReadOnly = mode === "view";

  const disabled =
    !code.trim() ||
    !Number.isFinite(value) ||
    !Number.isFinite(usageLimit) ||
    usageLimit < 1 ||
    !expiresAt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{helper}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="promo-code">Code *</Label>
            <Input
              id="promo-code"
              placeholder="e.g., NEWYEAR10"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-value">Value *</Label>
            <Input
              id="promo-value"
              type="number"
              value={Number.isFinite(value) ? String(value) : ""}
              onChange={(e) => setValue(Number(e.target.value))}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-usage">Usage limit *</Label>
            <Input
              id="promo-usage"
              type="number"
              value={Number.isFinite(usageLimit) ? String(usageLimit) : ""}
              onChange={(e) => setUsageLimit(Number(e.target.value))}
              disabled={isReadOnly}
              min={1}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-expires">Expires At *</Label>
            <Input
              id="promo-expires"
              type="datetime-local"
              value={toDatetimeLocalValue(expiresAt)}
              onChange={(e) => setExpiresAt(fromDatetimeLocalValue(e.target.value))}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  {active ? "Active" : "Inactive"}
                </p>
              </div>
              <Switch
                checked={active}
                onCheckedChange={setActive}
                disabled={isReadOnly}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isReadOnly ? "Close" : "Cancel"}
          </Button>
          {!isReadOnly && (
            <Button
              onClick={() => {
                const payload: PromoCodeFormValues = {
                  id: initial?.id ?? "",
                  code: code.trim(),
                  value,
                  usage_limit: usageLimit,
                  expires_at: expiresAt,
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
