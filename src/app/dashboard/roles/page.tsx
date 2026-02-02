"use client";

import * as React from "react";
import { notifyError, notifyInfo, notifySuccess } from "@/utils/notify";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Search,
  Lock,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
  ChevronRight as ChevronRt,
  MoreHorizontal,
  Download,
  FileSpreadsheet,
  FileText,
  FileX2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import PermissionBoundary from "@/components/permission-boundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  getRoleById,
  getRolePerms,
  updateRolePerms,
} from "@/services/roles";

import type { AdminRole } from "@/types/admin.types";
import { RoleForm, RoleData } from "@/components/roles/role-form";

import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

/* ---------------- PermissionsDisplay (inline panel in Permissions tab) ---------------- */

type PermissionsDisplayMeta = {
  totalSelected: number;
  saving: boolean;
};

type PermissionsDisplayHandle = {
  save: () => void;
};

const PermissionsDisplay = React.forwardRef<
  PermissionsDisplayHandle,
  {
    roleId: string;
    roleTitle: string;
    canViewRolePerms: boolean;
    canUpdateRolePerms: boolean;
    onSaved: (updated: any[]) => void;
    onMetaChange?: (meta: PermissionsDisplayMeta) => void;
  }
>(function PermissionsDisplay(
  {
    roleId,
    roleTitle,
    canViewRolePerms,
    canUpdateRolePerms,
    onSaved,
    onMetaChange,
  },
  ref
) {
  const [modules, setModules] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    async function fetchPermissions() {
      if (!roleId) return;

      setLoading(true);
      try {
        const perms = await getRolePerms(roleId);
        setModules(perms);

        const allClosed: Record<string, boolean> = {};
        perms.forEach((m: any) => {
          allClosed[m.module_slug] = false;
        });
        setExpanded(allClosed);
      } catch (error) {
        console.error("Error fetching permissions:", error);
        notifyError("Failed to load permissions");
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, [roleId]);

  const totalSelected = modules.reduce(
    (sum, m) => sum + m.permissions.filter((p: any) => p.is_allowed).length,
    0
  );

  React.useEffect(() => {
    onMetaChange?.({ totalSelected, saving });
  }, [onMetaChange, totalSelected, saving]);

  const filteredModules = React.useMemo(() => {
    if (!searchQuery.trim()) return modules;

    return modules.filter((m: any) =>
      m.module_slug.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [modules, searchQuery]);

  function toggleModule(slug: string) {
    setExpanded((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }

  function togglePermission(
    moduleSlug: string,
    permId: string,
    checked: boolean
  ) {
    if (!canUpdateRolePerms) return;

    setModules((prev: any[]) =>
      prev.map((m: any) =>
        m.module_slug !== moduleSlug
          ? m
          : {
              ...m,
              permissions: m.permissions.map((p: any) =>
                p.id === permId ? { ...p, is_allowed: checked } : p
              ),
            }
      )
    );
  }

  async function handleSave() {
    if (!canUpdateRolePerms) return;

    setSaving(true);
    try {
      await updateRolePerms({
        roleId,
        current: [],
        next: modules,
      });
      notifySuccess("Permissions updated");
      const fresh = await getRolePerms(roleId);
      setModules(fresh);
      onSaved(fresh);
    } catch (error) {
      console.error(error);
      notifyError("Failed to update permissions");
    } finally {
      setSaving(false);
    }
  }

  React.useImperativeHandle(
    ref,
    () => ({
      save: () => {
        void handleSave();
      },
    }),
    [handleSave]
  );

  function clearSearch() {
    setSearchQuery("");
  }

  if (loading) {
    return (
      <div className="py-4 text-sm text-muted-foreground">
        Loading permissions...
      </div>
    );
  }

  if (!canViewRolePerms && !canUpdateRolePerms) {
    return (
      <div className="py-4 text-sm text-muted-foreground">
        You don't have permission to view or update role permissions.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Toggle which actions this role can access.
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search modules..."
          className="w-full pl-8 pr-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filteredModules.length === 0 ? (
          <div className="py-4 text-sm text-muted-foreground text-center">
            No modules found matching &quot;{searchQuery}&quot;
          </div>
        ) : (
          filteredModules.map((m: any) => {
            const isOpen = !!expanded[m.module_slug];
            const selected = m.permissions.filter((p: any) => p.is_allowed)
              .length;
            return (
              <div key={m.module_slug} className="rounded-xl border bg-card p-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleModule(m.module_slug)}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") &&
                    toggleModule(m.module_slug)
                  }
                  className="flex cursor-pointer items-center justify-between rounded-lg p-1 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-1">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRt className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="font-medium capitalize text-sm">
                      {m.module_slug}
                    </div>
                  </div>
                  <Badge
                    variant={selected ? "default" : "outline"}
                    className="text-xs"
                  >
                    {selected} selected
                  </Badge>
                </div>

                {isOpen && (
                  <div className="mt-2 grid gap-1 md:grid-cols-2">
                    {m.permissions.map((p: any) => (
                      <label
                        key={p.id}
                        className="flex items-center justify-between rounded-lg border p-1.5 hover:bg-muted/40 text-sm"
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {p.permission_slug}
                          </div>
                        </div>
                        <Switch
                          checked={p.is_allowed}
                          onCheckedChange={(v) =>
                            togglePermission(m.module_slug, p.id, v)
                          }
                          disabled={!canUpdateRolePerms}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

/* ---------------- RolesPage (standardised like JobFiles/Permissions) ---------------- */

export default function RolesPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [roles, setRoles] = React.useState<AdminRole[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [query, setQuery] = React.useState("");

  // real pagination
  const [page, setPage] = React.useState(1);
  const limit = 5;
  const [pagination, setPagination] = React.useState<any | null>(null);

  const [openForm, setOpenForm] = React.useState(false);
  const [formMode, setFormMode] =
    React.useState<"create" | "edit" | "permissions">("create");
  const [editRole, setEditRole] = React.useState<AdminRole | null>(null);
  const [permRole, setPermRole] = React.useState<AdminRole | null>(null);

  const [permCountMap, setPermCountMap] = React.useState<
    Record<string, number>
  >({});

  const canList = useHasPermission(ENTITY_PERMS.roles.list);
  const canCreate = useHasPermission(ENTITY_PERMS.roles.create);
  const canRead = useHasPermission(ENTITY_PERMS.roles.read);
  const canUpdate = useHasPermission(ENTITY_PERMS.roles.update);
  const canDelete = useHasPermission(ENTITY_PERMS.roles.delete);
  const canViewRolePerms = useHasPermission(
    ENTITY_PERMS.roles.extras.getRolePerms
  );
  const canUpdateRolePerms = useHasPermission(
    ENTITY_PERMS.roles.extras.updateRolePerms
  );

  const permissionsRef = React.useRef<PermissionsDisplayHandle | null>(null);
  const [permMeta, setPermMeta] = React.useState<PermissionsDisplayMeta>({
    totalSelected: 0,
    saving: false,
  });

  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // search change → reset page
  React.useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  // fetch roles
  React.useEffect(() => {
    if (!mounted) return;
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        if (!canList) {
          setRoles([]);
          setPermCountMap({});
          setPagination(null);
          return;
        }
        const { rows, pagination: pg } = await listRoles(
          page,
          limit,
          debouncedQuery || undefined,
          { signal: ac.signal }
        );
        setRoles(rows);
        setPagination(pg ?? null);
      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.message === "canceled") return;
        console.error(e);
        notifyError(e?.response?.data?.message || "Failed to load roles");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [mounted, canList, page, limit, debouncedQuery]);

  const roleIdsKey = React.useMemo(
    () => roles.map((r) => r.id).join(","),
    [roles]
  );

  // Load permission counts for roles
  React.useEffect(() => {
    if (!mounted || !canList || !canViewRolePerms) return;

    let cancelled = false;

    (async () => {
      try {
        const limitConcurrency = 3;
        const newCountMap: Record<string, number> = {};

        for (let i = 0; i < roles.length; i += limitConcurrency) {
          if (cancelled) return;
          const chunk = roles.slice(i, i + limitConcurrency);

          const results = await Promise.all(
            chunk.map(async (role) => {
              try {
                const perms = await getRolePerms(role.id);
                const count = perms.reduce(
                  (sum: number, m: any) =>
                    sum + m.permissions.filter((p: any) => p.is_allowed).length,
                  0
                );
                return { roleId: role.id, count };
              } catch (error: any) {
                if (error?.response?.status === 403) {
                  return { roleId: role.id, count: 0 };
                }
                console.error(
                  `Failed to load permissions for role ${role.id}:`,
                  error
                );
                return { roleId: role.id, count: 0 };
              }
            })
          );

          results.forEach(({ roleId, count }) => {
            newCountMap[roleId] = count;
          });
        }

        if (cancelled) return;
        setPermCountMap(newCountMap);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, canList, canViewRolePerms, roleIdsKey]);

  const filtered = roles;

  const displayPermCount = (r: AdminRole) => {
    if (!canViewRolePerms) {
      return "No access";
    }
    return typeof permCountMap[r.id] === "number"
      ? `${permCountMap[r.id]} permissions`
      : "—";
  };

  // helper: refetch current page
  const refetchRoles = async () => {
    if (!canList) return;
    const { rows, pagination: pg } = await listRoles(
      page,
      limit,
      debouncedQuery || undefined
    );
    setRoles(rows);
    setPagination(pg ?? null);
  };

  async function handleCreate(data: RoleData) {
    if (!mounted || !canCreate) return;
    try {
      await createRole({ title: data.name });
      notifySuccess("Role created");
      await refetchRoles();
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Create failed");
    }
  }

  async function openEdit(roleId: string) {
    if (!mounted || !canUpdate) return;
    try {
      const role = await getRoleById(roleId);
      setEditRole(role);
      setFormMode("edit");
      setOpenForm(true);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Failed to open role");
    }
  }

  async function handleUpdate(data: RoleData) {
    if (!mounted || !canUpdate || !editRole?.id) return;
    try {
      await updateRole({ id: editRole.id, title: data.name });
      notifySuccess("Role updated");
      await refetchRoles();
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Update failed");
    }
  }

  async function handleDelete(id: string) {
    if (!mounted || !canDelete) return;
    try {
      await deleteRole(id);
      notifySuccess("Role deleted");

      const { rows, pagination: pg } = await listRoles(
        page,
        limit,
        debouncedQuery || undefined
      );
      if (rows.length === 0 && page > 1) {
        setPage((p) => p - 1);
      } else {
        setRoles(rows);
        setPagination(pg ?? null);
      }

      setPermCountMap((prev) => {
        const cp = { ...prev };
        delete cp[id];
        return cp;
      });
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Delete failed");
    }
  }

  const renderCreatedAt = (iso: string) => {
    if (!mounted) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const [activeTab, setActiveTab] = React.useState("roles");

  // pagination calculations (JobFiles-style, using backend metadata)
  const pagTotal = pagination?.total ?? filtered.length;
  const pagPage = pagination?.page ?? page;
  const pagTotalPages =
    (pagination?.totalPages ?? Math.ceil(pagTotal / limit)) || 1;

  const pagHasPrev = pagination?.hasPrev ?? pagPage > 1;
  const pagHasNext = pagination?.hasNext ?? pagPage < pagTotalPages;

  const pagStart = pagTotal === 0 ? 0 : (pagPage - 1) * limit + 1;
  const pagEnd = pagTotal === 0 ? 0 : Math.min(pagPage * limit, pagTotal);

  /* Export handlers – same pattern as JobFiles/Permissions */

  const handleExportCSV = () => {
    if (!filtered.length) {
      notifyInfo("No roles to export.");
      return;
    }

    const esc = (val: any) => `"${String(val ?? "").replace(/"/g, '""')}"`;

    const headers = ["Role", "Created At", "Permissions"];
    const rowsData = filtered.map((r) => [
      r.title,
      renderCreatedAt(r.created_at),
      displayPermCount(r),
    ]);

    const csv = [headers.map(esc).join(",")]
      .concat(rowsData.map((row) => row.map(esc).join(",")))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "roles.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    notifySuccess("Roles exported as CSV.");
  };

  const handleExportPDF = () => {
    if (!filtered.length) {
      notifyInfo("No roles to export.");
      return;
    }

    const popup = window.open("", "_blank");
    if (!popup) {
      notifyError("Popup blocked. Please allow popups to export PDF.");
      return;
    }

    const rowsHtml = filtered
      .map((r) => {
        return `
          <tr>
            <td>${r.title}</td>
            <td>${renderCreatedAt(r.created_at)}</td>
            <td>${displayPermCount(r)}</td>
          </tr>
        `;
      })
      .join("");

    popup.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Roles Export</title>
        <style>
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 16px; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background: #f3f4f6; }
          tr:nth-child(even) { background: #fafafa; }
        </style>
      </head>
      <body>
        <h1>Roles</h1>
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Created At</th>
              <th>Permissions</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <PermissionBoundary screen="/dashboard/roles" mode="block">
      <div className="space-y-6 scrollbar-stable">
        {/* Header – same structure as JobFiles/Permissions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Roles</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage user roles and permissions
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {mounted && !canCreate && (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3.5 w-3.5" />
                No create access
              </Badge>
            )}
            {mounted && activeTab === "roles" && (
              <Button
                className="gap-2 w-full sm:w-auto"
                onClick={() => {
                  setFormMode("create");
                  setOpenForm(true);
                }}
                disabled={!canCreate}
              >
                <Plus className="h-4 w-4" />
                Add Role
              </Button>
            )}
          </div>
        </div>

        <Tabs
          defaultValue="roles"
          className="w-full"
          onValueChange={setActiveTab}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
          </TabsList>

          {/* ---------------- ROLES TAB ---------------- */}
          <TabsContent value="roles">
            <Card className="shadow-sm">
              <CardHeader className="space-y-3">
                {/* Title + search + export – JobFiles-style row */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <CardTitle className="text-xl sm:text-2xl">
                    All Roles
                  </CardTitle>

                  <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
                    {/* Search */}
                    <div className="relative w-full sm:w-[260px] md:w-[320px] lg:w-[350px] max-w-full">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="h-9 pl-9 w-full"
                        placeholder="Search roles..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>

                    {/* Export dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 gap-1.5 border-muted-foreground/30 bg-background/60 px-3 text-xs font-medium text-muted-foreground shadow-sm hover:border-primary/40 hover:bg-primary/5 hover:text-primary self-end sm:self-auto"
                        >
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">Export</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          Export current view
                        </div>
                        <DropdownMenuItem
                          onClick={handleExportCSV}
                          className="cursor-pointer"
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4" /> Export
                          as CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleExportPDF}
                          className="cursor-pointer"
                        >
                          <FileText className="mr-2 h-4 w-4" /> Export as PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-3 sm:px-6">
                {loading ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Loading roles…
                  </div>
                ) : mounted && !canList ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    You don&apos;t have permission to view roles.
                  </div>
                ) : (
                  <>
                    {/* Table container – same pattern as other pages */}
                    <div className="mt-1 rounded-xl border overflow-hidden overflow-x-auto">
                      <Table className="min-w-[640px]">
                        <TableHeader>
                          <TableRow className="bg-gray-200">
                            <TableHead className="rounded-tl-xl pl-14 ">
                              Role
                            </TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead className="text-center">Permissions</TableHead>
                            <TableHead className="text-right rounded-tr-xl">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="p-8 text-center text-muted-foreground"
                              >
                                <div className="flex flex-col items-center justify-center gap-3">
                                  <Avatar className="h-16 w-16 border border-dashed border-muted-foreground/30 bg-muted/40">
                                    <AvatarFallback>
                                      <FileX2 className="h-7 w-7 text-muted-foreground" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="text-sm font-medium text-foreground">
                                    No roles found
                                  </div>
                                  <p className="text-xs text-muted-foreground max-w-xs">
                                    {query
                                      ? "No roles match your search. Try changing or clearing the search term."
                                      : "You don’t have any roles yet. Create your first role to start assigning permissions."}
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filtered.map((r, idx) => {
                              const isLast = idx === filtered.length - 1;
                              return (
                                <TableRow
                                  key={r.id}
                                  className="odd:bg-muted/30 even:bg-white hover:bg-transparent"
                                >
                                  <TableCell
                                    className={`${
                                      isLast ? "rounded-bl-xl" : ""
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-9 w-9 shrink-0">
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                          <Shield className="h-4 w-4" />
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <div className="font-medium truncate">
                                          {r.title}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>

                                  <TableCell className="text-sm text-muted-foreground">
                                    {renderCreatedAt(r.created_at)}
                                  </TableCell>

                                  <TableCell>
                                    <Badge
                                      variant="secondary"
                                      className="bg-primary text-primary-foreground hover:bg-primary"
                                    >
                                      {displayPermCount(r)}
                                    </Badge>
                                  </TableCell>

                                  <TableCell
                                    className={`text-right ${
                                      isLast ? "rounded-br-xl" : ""
                                    }`}
                                  >
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          aria-label="More actions"
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        align="end"
                                        className="w-40"
                                      >
                                        {canUpdate && (
                                          <DropdownMenuItem
                                            className="gap-2"
                                            onClick={() => openEdit(r.id)}
                                          >
                                            <Pencil className="h-4 w-4" />
                                            Edit
                                          </DropdownMenuItem>
                                        )}
                                        {canDelete && (
                                          <DropdownMenuItem
                                            className="gap-2 text-destructive focus:text-destructive"
                                            onClick={() =>
                                              handleDelete(r.id)
                                            }
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination – same responsive layout as JobFiles/Permissions */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
                      <div className="text-sm text-muted-foreground">Page {pagPage} of {pagTotalPages}</div>

                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        <Button
                          variant="pagination"
                          clickVariant="default"
                          size="sm"
                          disabled={!pagHasPrev}
                          className="gap-1"
                          onClick={() =>
                            setPage((p) => Math.max(1, p - 1))
                          }
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="hidden sm:inline">Previous</span>
                        </Button>

                        <Button
                          variant="pagination"
                          clickVariant="default"
                          size="sm"
                          disabled={!pagHasNext}
                          className="gap-1"
                          onClick={() => setPage((p) => p + 1)}
                        >
                          <span className="hidden sm:inline">Next</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- PERMISSIONS TAB ---------------- */}
          <TabsContent value="permissions">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Role Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-sm text-muted-foreground">
                    Loading roles…
                  </div>
                ) : mounted && !canList ? (
                  <div className="text-sm text-muted-foreground">
                    You don&apos;t have permission to view roles.
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="w-full max-w-full sm:max-w-md lg:max-w-lg">
                        <label
                          htmlFor="role-select"
                          className="block text-sm font-medium mb-2"
                        >
                          Select Role
                        </label>
                        <Select
                          value={permRole?.id || ""}
                          onValueChange={(value) => {
                            const selectedRole = roles.find((r) => r.id === value);
                            if (selectedRole) {
                              setPermRole(selectedRole);
                              setPermMeta({ totalSelected: 0, saving: false });
                              (async () => {
                                if (permCountMap[selectedRole.id] == null) {
                                  try {
                                    const perms = await getRolePerms(
                                      selectedRole.id
                                    );
                                    const c = perms.reduce(
                                      (sum: number, m: any) =>
                                        sum +
                                        m.permissions.filter(
                                          (p: any) => p.is_allowed
                                        ).length,
                                      0
                                    );
                                    setPermCountMap((prev) => ({
                                      ...prev,
                                      [selectedRole.id]: c,
                                    }));
                                  } catch {
                                    // ignore
                                  }
                                }
                              })();
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="-- Select a role --" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {filtered.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {permRole && (
                        <div className="flex items-end justify-end sm:items-end">
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="secondary">
                              {permMeta.totalSelected} allowed
                            </Badge>
                            {canUpdateRolePerms && (
                              <Button
                                onClick={() => permissionsRef.current?.save()}
                                disabled={permMeta.saving}
                              >
                                {permMeta.saving ? "Saving…" : "Save"}
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {permRole && (
                      <PermissionsDisplay
                        ref={permissionsRef}
                        roleId={permRole.id}
                        roleTitle={permRole.title}
                        canViewRolePerms={canViewRolePerms}
                        canUpdateRolePerms={canUpdateRolePerms}
                        onMetaChange={setPermMeta}
                        onSaved={(updated) => {
                          const count = updated.reduce(
                            (s: number, m: any) =>
                              s +
                              m.permissions.filter(
                                (p: any) => p.is_allowed
                              ).length,
                            0
                          );
                          setPermCountMap((prev) =>
                            permRole
                              ? { ...prev, [permRole.id]: count }
                              : prev
                          );
                        }}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Unified Create/Edit Form (same as before) */}
        <RoleForm
          mode={formMode}
          open={openForm}
          onOpenChange={setOpenForm}
          initialData={
            editRole
              ? {
                  id: editRole.id,
                  name: editRole.title,
                  description: "",
                  grants: {},
                }
              : undefined
          }
          roleId={formMode === "permissions" ? permRole?.id : undefined}
          roleTitle={formMode === "permissions" ? permRole?.title : undefined}
          onSubmit={formMode === "create" ? handleCreate : handleUpdate}
          onPermissionsSaved={(updated) => {
            const count = updated.reduce(
              (s: number, m: any) =>
                s + m.permissions.filter((p: any) => p.is_allowed).length,
              0
            );
            setPermCountMap((prev) =>
              permRole ? { ...prev, [permRole.id]: count } : prev
            );
          }}
        />
      </div>
    </PermissionBoundary>
  );
}
