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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SubcategoryFormValues = {
  id: string;
  name: string;
  description: string;
  cat_id: string;
  active: boolean;
};

export type SubcategoryFormProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit" | "view";
  initial?: Partial<SubcategoryFormValues>;
  categories: { id: string; name: string }[];
  onSubmit: (data: SubcategoryFormValues) => void | Promise<void>;
};

export default function SubcategoryFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  categories,
  onSubmit,
}: SubcategoryFormProps) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [desc, setDesc] = React.useState(initial?.description ?? "");
  const [catId, setCatId] = React.useState(initial?.cat_id ?? "");
  const [active, setActive] = React.useState(initial?.active ?? true);

  React.useEffect(() => {
    setName(initial?.name ?? "");
    setDesc(initial?.description ?? "");
    setCatId(initial?.cat_id ?? "");
    setActive(initial?.active ?? true);
  }, [initial, open]);

  const title =
    mode === "create"
      ? "Add Subcategory"
      : mode === "edit"
      ? "Edit Subcategory"
      : "View Subcategory";

  const helper =
    mode === "create"
      ? "Create a new subcategory under a category"
      : mode === "edit"
      ? "Update subcategory information"
      : "Subcategory details";

  const cta = mode === "create" ? "Create" : "Update";
  const disabled = !name.trim() || !catId;
  const isReadOnly = mode === "view";
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async () => {
    const payload: SubcategoryFormValues = {
      id: initial?.id ?? "",
      name: name.trim(),
      description: desc.trim(),
      cat_id: catId,
      active,
    };
    try {
      setSaving(true);
      await onSubmit(payload);
      // Parent closes dialog after refetch
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{helper}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subcategory-category">Category *</Label>
            <Select
              value={catId}
              onValueChange={setCatId}
              disabled={isReadOnly}
            >
              <SelectTrigger id="subcategory-category" className="h-10">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subcategory-name">Name *</Label>
            <Input
              id="subcategory-name"
              placeholder="e.g., Running Shoes"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subcategory-desc">Description</Label>
            <Textarea
              id="subcategory-desc"
              placeholder="Optional description"
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
              onClick={handleSubmit}
              disabled={disabled || saving}
            >
              {saving ? "Saving..." : cta}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
