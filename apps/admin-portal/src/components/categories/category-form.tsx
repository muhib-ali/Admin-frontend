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

export type CategoryFormValues = {
  id: string;
  name: string;
  description: string;
  active: boolean;
};

export type CategoryFormProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit" | "view";
  initial?: Partial<CategoryFormValues>;
  onSubmit: (data: CategoryFormValues) => void;
};

export default function CategoryFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: CategoryFormProps) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [desc, setDesc] = React.useState(initial?.description ?? "");
  const [active, setActive] = React.useState(initial?.active ?? true);

  React.useEffect(() => {
    setName(initial?.name ?? "");
    setDesc(initial?.description ?? "");
    setActive(initial?.active ?? true);
  }, [initial, open]);

  const title =
    mode === "create"
      ? "Add Category"
      : mode === "edit"
      ? "Edit Category"
      : "View Category";

  const helper =
    mode === "create"
      ? "Create a new category"
      : mode === "edit"
      ? "Update category information"
      : "Category details";

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
            <Label htmlFor="category-name">Name *</Label>
            <Input
              id="category-name"
              placeholder="e.g., General"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-desc">Description</Label>
            <Textarea
              id="category-desc"
              placeholder="General category"
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
                const payload: CategoryFormValues = {
                  id: initial?.id ?? "",
                  name: name.trim(),
                  description: desc.trim(),
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
