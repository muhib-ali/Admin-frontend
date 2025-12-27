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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export type WarehouseFormValues = {
  id: string;
  name: string;
  code: string;
  address: string;
  active: boolean;
};

export type WarehouseFormProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit" | "view";
  initial?: Partial<WarehouseFormValues>;
  onSubmit: (data: WarehouseFormValues) => void;
};

export default function WarehouseFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: WarehouseFormProps) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [code, setCode] = React.useState(initial?.code ?? "");
  const [address, setAddress] = React.useState(initial?.address ?? "");
  const [active, setActive] = React.useState(initial?.active ?? true);

  React.useEffect(() => {
    setName(initial?.name ?? "");
    setCode(initial?.code ?? "");
    setAddress(initial?.address ?? "");
    setActive(initial?.active ?? true);
  }, [initial, open]);

  const title =
    mode === "create"
      ? "Add Warehouse"
      : mode === "edit"
      ? "Edit Warehouse"
      : "View Warehouse";

  const helper =
    mode === "create"
      ? "Create a new warehouse"
      : mode === "edit"
      ? "Update warehouse information"
      : "Warehouse details";

  const cta = mode === "create" ? "Create" : "Update";
  const disabled = !name.trim() || !code.trim() || !address.trim();
  const isReadOnly = mode === "view";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{helper}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="warehouse-name">Name *</Label>
            <Input
              id="warehouse-name"
              placeholder="e.g., Main Warehouse"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warehouse-code">Code *</Label>
            <Input
              id="warehouse-code"
              placeholder="e.g., WH-001"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warehouse-address">Address *</Label>
            <Textarea
              id="warehouse-address"
              placeholder="Warehouse address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              disabled={isReadOnly}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="mb-0">Status</Label>
              <p className="text-xs text-muted-foreground">
                {active ? "Active" : "Inactive"}
              </p>
            </div>
            <Switch
              checked={active}
              onCheckedChange={setActive}
              disabled={isReadOnly}
            />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isReadOnly ? "Close" : "Cancel"}
          </Button>
          {!isReadOnly && (
            <Button
              onClick={() => {
                const payload: WarehouseFormValues = {
                  id: initial?.id ?? "",
                  name: name.trim(),
                  code: code.trim(),
                  address: address.trim(),
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
