"use client";

import * as React from "react";
import { toast } from "react-toastify";
import {
  Shield,
  Plus,
  Trash2,
  Pencil,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  FileX2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import PermissionBoundary from "@/components/permission-boundary";
import { PermissionForm, GeneratedPermission, ModuleInfo } from "@/components/permissions/permission-form";

import {
  listPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  type PermissionItem,
} from "@/services/permissions";
import { listModules } from "@/services/modules";

import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

function toRow(p: PermissionItem, moduleMap: Map<string, string>): GeneratedPermission {
  return {
    id: p.id,
    name: p.title,
    moduleId: p.moduleId,
    moduleName: moduleMap.get(p.moduleId) || p.moduleId,
    action: p.slug,
    description: p.description ?? "",
  };
}

export default function PermissionsPage() {
  const [modules, setModules] = React.useState<ModuleInfo[]>([]);
  const [moduleNameById, setModuleNameById] = React.useState<Map<string, string>>(new Map());

  const [data, setData] = React.useState<GeneratedPermission[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [q, setQ] = React.useState("");

  const [openForm, setOpenForm] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<GeneratedPermission | null>(null);

  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 7;

  const [moduleFilter] = React.useState<string | undefined>(undefined);

  const canList = useHasPermission(ENTITY_PERMS.permissions.list);
  const canCreate = useHasPermission(ENTITY_PERMS.permissions.create);
  const canUpdate = useHasPermission(ENTITY_PERMS.permissions.update);
  const canDelete = useHasPermission(ENTITY_PERMS.permissions.delete);

  React.useEffect(() => {
    (async () => {
      try {
        const { rows } = await listModules(1, 100);
        const mods: ModuleInfo[] = rows.map((m) => ({
          id: m.id,
          name: m.title,
          description: "",
        }));
        setModules(mods);
        const map = new Map<string, string>();
        mods.forEach((m) => map.set(m.id, m.name));
        setModuleNameById(map);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.response?.data?.message || "Failed to load modules");
      }
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        if (!canList) {
          setData([]);
          return;
        }

        const { rows } = await listPermissions({
          page: 1,
          limit: 1000,
          moduleId: moduleFilter,
        });

        setData(rows.map((p) => toRow(p, moduleNameById)));
      } catch (e: any) {
        console.error(e);
        toast.error(e?.response?.data?.message || "Failed to load permissions");
      } finally {
        setLoading(false);
      }
    })();
  }, [moduleFilter, moduleNameById, canList]);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        (r.moduleName ?? "").toLowerCase().includes(s) ||
        r.action.toLowerCase().includes(s) ||
        r.description.toLowerCase().includes(s)
    );
  }, [q, data]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pagPage = currentPage > totalPages ? totalPages : currentPage;

  const startIndex = filtered.length === 0 ? 0 : (pagPage - 1) * itemsPerPage;
  const endIndex = filtered.length === 0 ? 0 : startIndex + itemsPerPage;

  const paginatedData = filtered.slice(startIndex, endIndex);
  const pagTotal = filtered.length;

  const pagStart = pagTotal === 0 ? 0 : startIndex + 1;
  const pagEnd = pagTotal === 0 ? 0 : Math.min(endIndex, pagTotal);

  const pagHasPrev = pagPage > 1;
  const pagHasNext = pagPage < totalPages;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [q]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPrevious = () => {
    if (pagHasPrev) setCurrentPage((p) => p - 1);
  };

  const goToNext = () => {
    if (pagHasNext) setCurrentPage((p) => p + 1);
  };

  const addGenerated = async (items: GeneratedPermission[]) => {
    try {
      if (!canCreate) return;

      for (const it of items) {
        await createPermission({
          moduleId: it.moduleId,
          title: it.name,
          slug: it.action,
          description: it.description,
        });
      }
      toast.success(`Created ${items.length} permission(s)`);

      const { rows } = await listPermissions({
        page: 1,
        limit: 1000,
        moduleId: moduleFilter,
      });
      setData(rows.map((p) => toRow(p, moduleNameById)));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Create failed");
    }
  };

  const openCreateForm = () => {
    if (!canCreate) return;
    setFormMode("create");
    setEditing(null);
    setOpenForm(true);
  };

  const openEdit = async (row: GeneratedPermission) => {
    try {
      if (!canUpdate) return;
      const p = await getPermissionById(row.id);
      setEditing(toRow(p, moduleNameById));
      setFormMode("edit");
      setOpenForm(true);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to open permission");
    }
  };

  const saveEdit = async (p: GeneratedPermission) => {
    try {
      if (!canUpdate) return;
      await updatePermission({
        id: p.id,
        moduleId: p.moduleId,
        title: p.name,
        slug: p.action,
        description: p.description,
      });
      toast.success("Permission updated");

      setData((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Update failed");
    }
  };

  const removeRow = async (id: string) => {
    try {
      if (!canDelete) return;
      await deletePermission(id);
      toast.success("Permission deleted");
      setData((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  };

  const actionPill = (a: string) => {
    const map: Record<string, string> = {
      create: "bg-emerald-500/10 text-emerald-600",
      read: "bg-sky-500/10 text-sky-600",
      update: "bg-amber-500/10 text-amber-600",
      delete: "bg-red-500/10 text-red-600",
      readAll: "bg-indigo-500/10 text-indigo-600",
    };
    return (
      <Badge variant="secondary" className={`${map[a] || ""} capitalize`}>
        {a === "readAll" ? "read all" : a}
      </Badge>
    );
  };

  return (
    <PermissionBoundary screen="/dashboard/permissions" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Permissions</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage system permissions and access control
            </p>
          </div>

          <Button
            className="gap-2 w-full sm:w-auto"
            onClick={openCreateForm}
            disabled={!canCreate}
          >
            <Plus className="h-4 w-4" />
            Add Permission
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-xl sm:text-2xl">
                All Permissions
              </CardTitle>

              <div className="relative w-full sm:w-[260px] md:w-[320px] lg:w-[350px] max-w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search permissions..."
                  className="h-9 pl-9 w-full"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-6">
            <div className="mt-1 rounded-xl border overflow-hidden overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow className="bg-gray-200">
                    <TableHead className="w-9 rounded-tl-xl" />
                    <TableHead>Permission</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[120px] text-right rounded-tr-xl">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="p-8 text-center text-muted-foreground"
                      >
                        Loading permissions…
                      </TableCell>
                    </TableRow>
                  ) : !canList ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="p-8 text-center text-muted-foreground"
                      >
                        You don't have permission to view permissions.
                      </TableCell>
                    </TableRow>
                  ) : paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="p-8 text-center text-muted-foreground"
                      >
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Avatar className="h-16 w-16 border border-dashed border-muted-foreground/30 bg-muted/40">
                            <AvatarFallback>
                              <FileX2 className="h-7 w-7 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-sm font-medium text-foreground">
                            No permissions found
                          </div>
                          <p className="text-xs text-muted-foreground max-w-xs">
                            {q
                              ? "No permissions match your search. Try changing or clearing the search term."
                              : "You don't have any permissions yet. Generate permissions by selecting modules and actions."}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((row, idx) => {
                      const isLast = idx === paginatedData.length - 1;

                      return (
                        <TableRow
                          key={row.id}
                          className="odd:bg-muted/30 even:bg-white hover:bg-transparent"
                        >
                          <TableCell>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                          </TableCell>

                          <TableCell
                            className={`font-medium ${
                              isLast ? "rounded-bl-xl" : ""
                            }`}
                          >
                            {row.name}
                          </TableCell>

                          <TableCell>{row.moduleName}</TableCell>

                          <TableCell>{actionPill(row.action)}</TableCell>

                          <TableCell className="text-muted-foreground">
                            {row.description}
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
                                    onClick={() => openEdit(row)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {canDelete && (
                                  <DropdownMenuItem
                                    className="gap-2 text-destructive focus:text-destructive"
                                    onClick={() => removeRow(row.id)}
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
              <div className="text-sm text-muted-foreground">Page {pagPage} of {totalPages}</div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <Button
                  variant="pagination"
                  clickVariant="default"
                  size="sm"
                  disabled={!pagHasPrev}
                  onClick={goToPrevious}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>

                <Button
                  variant="pagination"
                  clickVariant="default"
                  size="sm"
                  disabled={!pagHasNext}
                  onClick={goToNext}
                  className="gap-1"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <PermissionForm
          open={openForm}
          onOpenChange={setOpenForm}
          modules={modules}
          onCreate={addGenerated}
          editMode={formMode === "edit"}
          editValue={editing}
          onSave={saveEdit}
        />
      </div>
    </PermissionBoundary>
  );
}
