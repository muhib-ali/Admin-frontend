"use client";

import * as React from "react";
import { Plus, Check, X } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export type ModuleInfo = {
  id: string;
  name: string;
  description: string;
};

export type GeneratedPermission = {
  id: string;
  name: string;
  moduleId: string;
  moduleName: string;
  action: string;
  description: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  modules: ModuleInfo[];
  onCreate: (items: GeneratedPermission[]) => void;
  editMode?: boolean;
  editValue?: GeneratedPermission | null;
  onSave?: (p: GeneratedPermission) => void;
};

const CRUD = ["create", "read", "update", "delete", "readAll"] as const;

export function PermissionForm({
  open,
  onOpenChange,
  modules,
  onCreate,
  editMode = false,
  editValue = null,
  onSave,
}: Props) {
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [crud, setCrud] = React.useState<
    Record<(typeof CRUD)[number], boolean>
  >({
    create: false,
    read: false,
    update: false,
    delete: false,
    readAll: false,
  });
  const [custom, setCustom] = React.useState<string>("");
  const [chips, setChips] = React.useState<string[]>([]);

  const [draft, setDraft] = React.useState<GeneratedPermission | null>(
    editValue
  );

  React.useEffect(() => {
    if (!open) {
      setSelected({});
      setCrud({
        create: false,
        read: false,
        update: false,
        delete: false,
        readAll: false,
      });
      setCustom("");
      setChips([]);
      setDraft(null);
    }
  }, [open]);

  React.useEffect(() => setDraft(editValue ?? null), [editValue]);

  const toggleModule = (id: string) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  const toggleCrud = (k: (typeof CRUD)[number]) =>
    setCrud((s) => ({ ...s, [k]: !s[k] }));

  const addChip = () => {
    const v = custom.trim();
    if (!v) return;
    if (!chips.includes(v)) setChips((a) => [...a, v]);
    setCustom("");
  };

  const removeChip = (v: string) =>
    setChips((a) => a.filter((x) => x !== v));

  const handleSaveEdit = () => {
    if (draft && onSave) {
      onSave(draft);
      onOpenChange(false);
    }
  };

  const handleCreate = () => {
    const chosenModules = modules.filter((m) => selected[m.id]);
    const chosenActions = [
      ...CRUD.filter((k) => crud[k]),
      ...chips.map((c) => c.toLowerCase().replace(/\s+/g, "_")),
    ];

    const items: GeneratedPermission[] = [];
    for (const m of chosenModules) {
      for (const a of chosenActions) {
        const pretty =
          a === "readAll"
            ? "Read All"
            : a === "create" || a === "read" || a === "update" || a === "delete"
            ? a[0].toUpperCase() + a.slice(1)
            : a.replace(/_/g, " ");
        items.push({
          id: crypto.randomUUID(),
          name: `${pretty} ${m.name.replace(/ Management$/i, "")}`.trim(),
          moduleId: m.id,
          moduleName: m.name,
          action: a,
          description:
            a === "readAll"
              ? `Read all items in ${m.name}`
              : `Permission to ${pretty.toLowerCase()} for ${m.name}`,
        });
      }
    }

    onCreate(items);
    onOpenChange(false);
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const actionsCount = CRUD.filter((k) => crud[k]).length + chips.length;

  if (editMode && draft) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Permission</DialogTitle>
            <DialogDescription>
              Update permission information.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Permission Name</Label>
              <Input
                value={draft.name}
                onChange={(e) =>
                  setDraft({ ...draft, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Module</Label>
              <Select
                value={draft.moduleId}
                onValueChange={(v) => {
                  const mod = modules.find((m) => m.id === v)!;
                  setDraft({
                    ...draft,
                    moduleId: v,
                    moduleName: mod.name,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Action</Label>
              <Input
                value={draft.action}
                onChange={(e) =>
                  setDraft({ ...draft, action: e.target.value })
                }
                placeholder="create / read / update / delete / readAll / custom_key"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[86vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editMode ? "Edit Permission" : "Create New Permissions"}
          </DialogTitle>
          <DialogDescription>
            {editMode
              ? "Update permission information."
              : "Select modules and actions to auto-generate permissions."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <h4 className="font-medium">Select Modules</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map((m) => {
              const isOn = !!selected[m.id];

              const toggle = () => toggleModule(m.id);
              const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle();
                }
              };

              return (
                <div
                  key={m.id}
                  role="button"
                  tabIndex={0}
                  onClick={toggle}
                  onKeyDown={onKey}
                  className={`rounded-xl border p-4 text-left transition ${
                    isOn ? "border-primary/40 bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Checkbox
                      checked={isOn}
                      onCheckedChange={toggle}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="font-medium">{m.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {m.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium">Module Permissions</h4>

          <div className="grid grid-cols-5 gap-3">
            {CRUD.map((k) => (
              <label
                key={k}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm capitalize transition ${
                  crud[k]
                    ? "border-primary/40 bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <Checkbox
                  checked={crud[k]}
                  onCheckedChange={() => toggleCrud(k)}
                />
                {k === "readAll" ? "Read All" : k}
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Add Custom Permission</Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="e.g. Export"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addChip();
                  }
                }}
              />
              <Button type="button" onClick={addChip}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
            {!!chips.length && (
              <div className="flex flex-wrap gap-2 pt-1">
                {chips.map((c) => (
                  <Badge key={c} variant="secondary" className="gap-1">
                    {c}
                    <X
                      className="ml-1 h-3.5 w-3.5 cursor-pointer"
                      onClick={() => removeChip(c)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{selectedCount}</span> module(s),{" "}
            <span className="font-medium">{actionsCount}</span> action(s)
            selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!selectedCount || !actionsCount}
            >
              <Check className="mr-2 h-4 w-4" />
              Create{" "}
              {selectedCount && actionsCount
                ? selectedCount * actionsCount
                : 0}{" "}
              Permissions
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
