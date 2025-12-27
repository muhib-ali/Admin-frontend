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
import { Textarea } from "@/components/ui/textarea";

export type SupplierFormValues = {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  active: boolean;
};

export type SupplierFormProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit" | "view";
  initial?: Partial<SupplierFormValues>;
  onSubmit: (data: SupplierFormValues) => void;
};

export default function SupplierFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: SupplierFormProps) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [address, setAddress] = React.useState(initial?.address ?? "");
  const [email, setEmail] = React.useState(initial?.email ?? "");
  const [phone, setPhone] = React.useState(initial?.phone ?? "");
  const [active, setActive] = React.useState(initial?.active ?? true);

  React.useEffect(() => {
    setName(initial?.name ?? "");
    setAddress(initial?.address ?? "");
    setEmail(initial?.email ?? "");
    setPhone(initial?.phone ?? "");
    setActive(initial?.active ?? true);
  }, [initial, open]);

  const isReadOnly = mode === "view";

  const title =
    mode === "create"
      ? "Add Supplier"
      : mode === "edit"
      ? "Edit Supplier"
      : "View Supplier";

  const helper =
    mode === "create"
      ? "Create a new supplier"
      : mode === "edit"
      ? "Update supplier information"
      : "Supplier details";

  const cta = mode === "create" ? "Create" : "Update";

  const disabled = !name.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{helper}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplier-name">Supplier Name *</Label>
            <Input
              id="supplier-name"
              placeholder="e.g., ABC Trading"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier-address">Address</Label>
            <Textarea
              id="supplier-address"
              placeholder="Supplier address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier-email">Email</Label>
            <Input
              id="supplier-email"
              placeholder="e.g., supplier@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isReadOnly}
              inputMode="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier-phone">Phone</Label>
            <Input
              id="supplier-phone"
              placeholder="e.g., +1 555 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isReadOnly}
              inputMode="tel"
            />
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
                const payload: SupplierFormValues = {
                  id: initial?.id ?? "",
                  name: name.trim(),
                  address: address.trim(),
                  email: email.trim(),
                  phone: phone.trim(),
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
