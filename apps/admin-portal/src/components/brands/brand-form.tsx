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

export type BrandFormValues = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
};

export type BrandFormProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit" | "view";
  initial?: Partial<BrandFormValues>;
  onSubmit: (data: BrandFormValues) => void;
};

export default function BrandFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: BrandFormProps) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [desc, setDesc] = React.useState(initial?.description ?? "");
  const [isActive, setIsActive] = React.useState(initial?.isActive ?? true);

  React.useEffect(() => {
    setName(initial?.name ?? "");
    setDesc(initial?.description ?? "");
    setIsActive(initial?.isActive ?? true);
  }, [initial, open]);

  const title =
    mode === "create" ? "Add Brand" : mode === "edit" ? "Edit Brand" : "View Brand";
  const helper =
    mode === "create"
      ? "Create a new brand"
      : mode === "edit"
      ? "Update brand information"
      : "Brand details";

  const cta = mode === "create" ? "Create" : "Update";
  const disabled = !name.trim();
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
            <Label htmlFor="brand-name">Name *</Label>
            <Input
              id="brand-name"
              placeholder="e.g., Toyota"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-desc">Description</Label>
            <Textarea
              id="brand-desc"
              placeholder="Automotive brand"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  {isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
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
                const payload: BrandFormValues = {
                  id: initial?.id ?? "",
                  name: name.trim(),
                  description: desc.trim(),
                  isActive,
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
