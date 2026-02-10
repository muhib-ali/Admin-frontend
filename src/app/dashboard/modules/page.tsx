"use client";

import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { notifyError, notifySuccess } from "@/utils/notify";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";
import ModuleFormDialog, {
  ModuleRow,
} from "@/components/modules/module-form";
import PermissionBoundary from "@/components/permission-boundary";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import {
  listModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
} from "@/services/modules";
import {
  listPermissionsByModuleId,
  deletePermission,
} from "@/services/permissions";

import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

function getSafeIcon(name?: string) {
  if (!name) return (Icons as any).Package;
  const I = (Icons as any)[name];
  return I || (Icons as any).Package || (Icons as any).Boxes;
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold",
        active
          ? "bg-green-200 text-green-800"
          : "bg-gray-200 text-muted-foreground"
      )}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function ModulesPage() {
  const [rows, setRows] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const limit = 5;
  const [pagination, setPagination] = useState<any | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");
  const [current, setCurrent] = useState<ModuleRow | undefined>(undefined);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canList = useHasPermission(ENTITY_PERMS.modules.list);
  const canCreate = useHasPermission(ENTITY_PERMS.modules.create);
  const canRead = useHasPermission(ENTITY_PERMS.modules.read);
  const canUpdate = useHasPermission(ENTITY_PERMS.modules.update);
  const canDelete = useHasPermission(ENTITY_PERMS.modules.delete);

  const normalizeRows = (modules: any[]): ModuleRow[] =>
    modules.map((m) => ({
      id: m.id,
      name: m.title,
      slug: m.slug ?? "",
      description: m.description ?? "",
      icon: "Package",
      active: m.is_active ?? false,
    }));

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        if (!canList) {
          setRows([]);
          setPagination(null);
          return;
        }
        const { rows: list, pagination: pg } = await listModules(
          page,
          limit,
          debouncedQuery || undefined,
          { signal: ac.signal }
        );
        setRows(normalizeRows(list));
        setPagination(pg ?? null);
      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.message === "canceled") return;
        console.error(e);
        notifyError(e?.response?.data?.message || "Failed to load modules");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [page, limit, canList, debouncedQuery]);

  const filtered = useMemo(() => rows, [rows]);

  const refetch = async () => {
    if (!canList) return;
    const { rows: list, pagination: pg } = await listModules(
      page,
      limit,
      debouncedQuery || undefined
    );
    setRows(normalizeRows(list));
    setPagination(pg ?? null);
  };

  const openCreate = () => {
    if (!canCreate) return;
    setMode("create");
    setCurrent(undefined);
    setOpen(true);
  };

  const openEdit = async (row: ModuleRow) => {
    if (!canUpdate) return;
    try {
      const m = await getModuleById(row.id);
      setMode("edit");
      setCurrent({
        id: m.id,
        name: m.title,
        slug: m.slug ?? "",
        description: m.description ?? "",
        icon: row.icon || "Package",
        active: m.is_active ?? false,
      });
      setOpen(true);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Failed to open module");
    }
  };

  const openView = async (row: ModuleRow) => {
    if (!canRead) return;
    try {
      const m = await getModuleById(row.id);
      setMode("view");
      setCurrent({
        id: m.id,
        name: m.title,
        slug: m.slug ?? "",
        description: m.description ?? "",
        icon: row.icon || "Package",
        active: m.is_active ?? false,
      });
      setOpen(true);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Failed to open module");
    }
  };

  const upsert = async (m: ModuleRow) => {
    try {
      if (mode === "create") {
        if (!canCreate) return;
        await createModule({
          title: m.name,
          slug: m.slug,
          description: m.description || "",
        });
        notifySuccess("Module created");
      } else {
        if (!canUpdate) return;
        await updateModule({
          id: m.id,
          title: m.name,
          slug: m.slug,
          description: m.description || "",
        });
        notifySuccess("Module updated");
      }

      await refetch();
      setOpen(false);
      setCurrent(undefined);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Save failed");
    }
  };

  const requestRemove = (moduleId: string) => {
    if (!canDelete) return;
    setDeleteTargetId(moduleId);
    setDeleteOpen(true);
  };

  const confirmRemove = async () => {
    if (!canDelete) return;
    if (!deleteTargetId) return;

    const moduleId = deleteTargetId;

    try {
      setDeleting(true);
      const perms = await listPermissionsByModuleId(moduleId);

      for (const p of perms) {
        try {
          await deletePermission(p.id);
        } catch (e: any) {
          console.error("Failed deleting permission", p.id, e);
          throw e;
        }
      }

      await deleteModule(moduleId);
      notifySuccess("Module and its permissions deleted");

      const { rows: list, pagination: pg } = await listModules(
        page,
        limit,
        debouncedQuery || undefined
      );
      if (list.length === 0 && page > 1) {
        setPage((p) => p - 1);
      } else {
        setRows(normalizeRows(list));
        setPagination(pg ?? null);
      }

      setDeleteOpen(false);
      setDeleteTargetId(null);
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.message || e?.message || "Delete failed";
      notifyError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const Plus = (Icons as any).Plus;
  const Pencil = (Icons as any).Pencil;
  const Trash2 = (Icons as any).Trash2;
  const Eye = (Icons as any).Eye;
  const Search = (Icons as any).Search;
  const ChevronLeft = (Icons as any).ChevronLeft;
  const ChevronRight = (Icons as any).ChevronRight;
  const MoreHorizontal = (Icons as any).MoreHorizontal;
  const Loader2 = (Icons as any).Loader2;

  const pagTotal = pagination?.total ?? filtered.length;
  const pagPage = pagination?.page ?? page;
  const pagTotalPages =
    (pagination?.totalPages ?? Math.ceil(pagTotal / limit)) || 1;

  const pagHasPrev = pagination?.hasPrev ?? pagPage > 1;
  const pagHasNext = pagination?.hasNext ?? pagPage < pagTotalPages;

  const pagStart = pagTotal === 0 ? 0 : (pagPage - 1) * limit + 1;
  const pagEnd = pagTotal === 0 ? 0 : Math.min(pagPage * limit, pagTotal);

  return (
    <PermissionBoundary screen="/dashboard/modules" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Modules</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage system modules and features
            </p>
          </div>
          <Button
            className="gap-2 w-full sm:w-auto"
            onClick={openCreate}
            disabled={!canCreate}
          >
            <Plus className="h-4 w-4" />
            Add Module
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-xl sm:text-2xl">All Modules</CardTitle>

              <div className="relative w-full sm:w-[260px] md:w-[320px] lg:w-[350px] max-w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 pl-9 w-full"
                  placeholder="Search modules..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-6">
            <div className="mt-1 relative w-full overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[800px] caption-bottom text-sm">
                <thead>
                  <tr className="text-left bg-gray-200">
                    <th className="p-3 font-medium rounded-tl-xl">Module</th>
                    <th className="p-3 font-medium">Description</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium text-right rounded-tr-xl">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 text-center text-muted-foreground"
                      >
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading modules…
                        </div>
                      </td>
                    </tr>
                  ) : !canList ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 text-center text-muted-foreground"
                      >
                        You don't have permission to view modules.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filtered.map((m, idx) => {
                        const Icon = getSafeIcon(m.icon);
                        const isLast = idx === filtered.length - 1;
                        return (
                          <tr
                            key={m.id}
                            className="odd:bg-muted/30 even:bg-white"
                          >
                            <td
                              className={`p-4 ${
                                isLast ? "rounded-bl-xl" : ""
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="grid h-10 w-10 place-items-center rounded-md bg-muted">
                                  <Icon className="h-5 w-5" />
                                </span>
                                <div className="font-medium">
                                  {m.name}
                                  <div className="text-[11px] text-muted-foreground">
                                    slug: {m.slug}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-muted-foreground">
                              {m.description}
                            </td>
                            <td className="p-4">
                              <StatusPill active={m.active} />
                            </td>
                            <td
                              className={`p-4 text-right ${
                                isLast ? "rounded-br-xl" : ""
                              }`}
                            >
                              <div className="flex justify-end">
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
                                    {canRead && (
                                      <DropdownMenuItem
                                        className="gap-2"
                                        onClick={() => openView(m)}
                                      >
                                        <Eye className="h-4 w-4" />
                                        View
                                      </DropdownMenuItem>
                                    )}
                                    {canUpdate && (
                                      <DropdownMenuItem
                                        className="gap-2"
                                        onClick={() => openEdit(m)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                    )}
                                    {canDelete && (
                                      <DropdownMenuItem
                                        className="gap-2 text-destructive focus:text-destructive"
                                        onClick={() => requestRemove(m.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {filtered.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-8 text-center text-muted-foreground"
                          >
                            No modules found.
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
              <div className="text-sm text-muted-foreground">Page {pagPage} of {pagTotalPages}</div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <Button
                  variant="pagination"
                  clickVariant="default"
                  size="sm"
                  disabled={!pagHasPrev}
                  className="gap-1"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
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
          </CardContent>
        </Card>

        <ModuleFormDialog
          open={open}
          onOpenChange={(v) => {
            if (!v) setCurrent(undefined);
            setOpen(v);
          }}
          mode={mode}
          initial={current}
          onSubmit={upsert}
        />

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={(v) => {
            if (!v) setDeleteTargetId(null);
            setDeleteOpen(v);
          }}
          title="Delete module"
          description="This will delete all permissions under this module, then delete the module. Continue?"
          confirmText="Delete"
          cancelText="Cancel"
          destructive
          loading={deleting}
          onConfirm={confirmRemove}
        />
      </div>
    </PermissionBoundary>
  );
}
