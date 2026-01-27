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

export type ModuleRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  active: boolean;
};

export type ModuleFormProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit" | "view";
  initial?: Partial<ModuleRow>;
  onSubmit: (data: ModuleRow) => void;
};

function slugify(s: string) {
  return s
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .replace(/^-+|-+$/g, "");
}

export default function ModuleFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: ModuleFormProps) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [slug, setSlug] = React.useState(initial?.slug ?? "");
  const [desc, setDesc] = React.useState(initial?.description ?? "");
  const [icon, setIcon] = React.useState(initial?.icon ?? "Package");
  const [active, setActive] = React.useState(initial?.active ?? true);

  React.useEffect(() => {
    setName(initial?.name ?? "");
    setSlug(initial?.slug ?? "");
    setDesc(initial?.description ?? "");
    setIcon(initial?.icon ?? "Package");
    setActive(initial?.active ?? true);
  }, [initial, open]);

  React.useEffect(() => {
    if (mode === "create" && !slug.trim()) {
      setSlug(slugify(name));
    }
  }, [name, mode, slug]);

  const isReadOnly = mode === "view";

  const title =
    mode === "create" ? "Create New Module" : mode === "edit" ? "Edit Module" : "View Module";
  const cta = mode === "create" ? "Create" : "Update";

  const disabled = !name.trim() || !slug.trim() || !desc.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new module to your system"
              : "Update module information"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="m-name">Module Name *</Label>
            <Input
              id="m-name"
              placeholder="e.g., Claim Management"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-slug">Slug *</Label>
            <Input
              id="m-slug"
              placeholder="claimManagement"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={isReadOnly}
            />
            <p className="text-[11px] text-muted-foreground">
              Backend requires a slug (e.g. <b>claimManagement</b>)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-desc">Description *</Label>
            <Textarea
              id="m-desc"
              placeholder="Describe what this module does"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-icon">Icon Name (UI-only)</Label>
            <Input
              id="m-icon"
              placeholder="Package"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              disabled={isReadOnly}
            />
            <p className="text-[11px] text-muted-foreground">
              Lucide icon name (e.g. <b>Package</b>, <b>Boxes</b>, <b>Users</b>).
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="mb-0">Active Status</Label>
              <p className="text-xs text-muted-foreground">
                Enable this module for use
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

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isReadOnly ? "Close" : "Cancel"}
          </Button>
          {!isReadOnly && (
            <Button
              onClick={() => {
                const payload: ModuleRow = {
                  id: initial?.id ?? crypto.randomUUID(),
                  name: name.trim(),
                  slug: slug.trim(),
                  description: desc.trim(),
                  icon: icon.trim() || "Package",
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
