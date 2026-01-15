"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Shield } from "lucide-react";
import { getRolePerms, updateRolePerms } from "@/services/roles";
import type { RoleModulePerm } from "@/types/admin.types";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

/** Types */
export type PermissionAction = "create" | "read" | "update" | "delete";
export type ModuleKey = "user" | "tickets" | "reports" | "invoices";

export interface RoleData {
  id?: string;
  name: string;
  description: string;
  grants: Partial<Record<ModuleKey, PermissionAction[]>>;
}

export interface RoleFormProps {
  mode: "create" | "edit" | "permissions";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialData?: RoleData | null;
  roleId?: string;
  roleTitle?: string;
  onSubmit?: (data: RoleData) => void;
  onPermissionsSaved?: (updated: RoleModulePerm[]) => void;
}

/** Static modules->permissions (mock) */
const MODULES: Record<
  ModuleKey,
  { title: string; blurb: string; actions: PermissionAction[] }
> = {
  user:     { title: "User Management",    blurb: "Manage system users and their access", actions: ["create","read","update","delete"] },
  tickets:  { title: "Ticket Management",  blurb: "Manage support tickets and their lifecycle", actions: ["create","read","update","delete"] },
  reports:  { title: "Reporting",          blurb: "Generate and view system reports", actions: ["read"] },
  invoices: { title: "Invoice Management", blurb: "Create and manage invoices", actions: ["create","read","update","delete"] },
};

export function RoleForm({ mode, open, onOpenChange, initialData, roleId, roleTitle, onSubmit, onPermissionsSaved }: RoleFormProps) {
  const [name, setName] = React.useState(initialData?.name ?? "");
  const [desc, setDesc] = React.useState(initialData?.description ?? "");
  const [expanded, setExpanded] = React.useState<Record<ModuleKey, boolean>>({
    user: true, tickets: false, reports: false, invoices: false,
  });
  const [grants, setGrants] = React.useState<RoleData["grants"]>(
    initialData?.grants ?? {}
  );
  
  // Permissions mode states
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [modules, setModules] = React.useState<RoleModulePerm[]>([]);
  const [permExpanded, setPermExpanded] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!open) return;
    setName(initialData?.name ?? "");
    setDesc(initialData?.description ?? "");
    setGrants(initialData?.grants ?? {});
  }, [open, initialData]);
  
  // Load permissions for permissions mode
  React.useEffect(() => {
    if (!open || mode !== "permissions" || !roleId) return;
    (async () => {
      try {
        setLoading(true);
        const perms = await getRolePerms(roleId);
        setModules(perms);
        const exp: Record<string, boolean> = {};
        perms.forEach((m) => {
          exp[m.module_slug] = m.permissions.some((p) => p.is_allowed);
        });
        setPermExpanded(exp);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.response?.data?.message || "Failed to load permissions");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, mode, roleId]);

  function toggleModuleForCreateEdit(module: ModuleKey) {
    setExpanded((p) => ({ ...p, [module]: !p[module] }));
  }

  function toggleAction(module: ModuleKey, action: PermissionAction, checked: boolean) {
    setGrants((prev) => {
      const existing = new Set(prev[module] ?? []);
      if (checked) existing.add(action);
      else existing.delete(action);
      const next = Array.from(existing);
      return { ...prev, [module]: next };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: RoleData = {
      id: initialData?.id,
      name: name.trim(),
      description: desc.trim(),
      grants,
    };
    onSubmit?.(payload);
    onOpenChange(false);
  }
  
  const totalPerms = Object.values(grants).reduce((sum, arr) => sum + (arr?.length ?? 0), 0);
  
  // Permissions mode handlers
  const totalSelected = modules.reduce(
    (sum, m) => sum + m.permissions.filter((p) => p.is_allowed).length,
    0
  );

  function toggleModule(slug: string) {
    if (mode === "permissions") {
      setPermExpanded((prev) => ({ ...prev, [slug]: !prev[slug] }));
    } else {
      // For create/edit modes, cast slug to ModuleKey
      const moduleKey = slug as ModuleKey;
      setExpanded((p) => ({ ...p, [moduleKey]: !p[moduleKey] }));
    }
  }

  function togglePermission(moduleSlug: string, permId: string, checked: boolean) {
    setModules((prev) =>
      prev.map((m) =>
        m.module_slug !== moduleSlug
          ? m
          : {
              ...m,
              permissions: m.permissions.map((p) =>
                p.id === permId ? { ...p, is_allowed: checked } : p
              ),
            }
      )
    );
  }

  async function handleSavePermissions() {
    if (!roleId) return;
    try {
      setSaving(true);
      await updateRolePerms({
        roleId,
        current: [],
        next: modules,
      });
      toast.success("Permissions updated");
      const fresh = await getRolePerms(roleId);
      setModules(fresh);
      onPermissionsSaved?.(fresh);
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to update permissions");
    } finally {
      setSaving(false);
    }
  }
  
  // Early return for permissions mode
  if (mode === "permissions") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="p-0 w-[95vw] max-w-none sm:w-[720px] sm:max-w-[720px] h-[80vh] max-h-[80vh] grid grid-rows-[auto,1fr,auto]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissions — {roleTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 overflow-y-auto">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Toggle which actions this role can access.
                  </div>
                  <Badge variant="secondary">{totalSelected} allowed</Badge>
                </div>

                <div className="space-y-3">
                  {modules.map((m) => {
                    const isOpen = permExpanded[m.module_slug];
                    const selected = m.permissions.filter((p) => p.is_allowed).length;
                    return (
                      <div key={m.module_slug} className="rounded-xl border bg-card p-3">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleModule(m.module_slug)}
                          onKeyDown={(e) =>
                            (e.key === "Enter" || e.key === " ") && toggleModule(m.module_slug)
                          }
                          className="flex cursor-pointer items-center justify-between rounded-lg p-2 hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            {isOpen ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div className="font-medium capitalize">{m.module_slug}</div>
                          </div>
                          <Badge variant={selected ? "default" : "outline"}>
                            {selected} selected
                          </Badge>
                        </div>

                        {isOpen && (
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {m.permissions.map((p) => (
                              <label
                                key={p.id}
                                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/40"
                              >
                                <div>
                                  <div className="font-medium">{p.permission_slug}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">id: {p.id}</div>
                                </div>
                                <Switch
                                  checked={p.is_allowed}
                                  onCheckedChange={(v) => togglePermission(m.module_slug, p.id, v)}
                                />
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-2 sticky bg-background">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* p-0 so we can build our own sticky header/footer + scrollable body */}
      <DialogContent className="sm:max-w-3xl p-0">
        {/* Fixed header */}
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {mode === "create" ? "Create New Role" : "Edit Role"}
          </DialogTitle>
        </DialogHeader>

        {/* Form with scrollable body and sticky footer */}
        <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
          {/* Scrollable body: header( ~64px ) + footer( ~96px ) reserved */}
          <div className="px-6 pb-6 overflow-y-auto max-h-[calc(90vh-160px)]">
            {/* Top fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="role-name">Role Name *</Label>
                <Input
                  id="role-name"
                  placeholder="Enter role name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="role-desc">Description *</Label>
                <Input
                  id="role-desc"
                  placeholder="Brief description of the role"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  required
                />
              </div>
            </div>

            <Separator className="my-4" />

            {/* Modules & permissions */}
           
          </div>

          {/* Sticky footer (always visible) */}
          <div className="sticky flex justify-end gap-3 border-t bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{mode === "create" ? "Create" : "Update"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
