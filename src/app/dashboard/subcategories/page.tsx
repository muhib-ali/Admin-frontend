"use client";

import * as React from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  FolderTree,
  Plus,
  Eye,
  Pencil,
  Trash2,
  SearchX,
  Loader2,
  Download,
  FileSpreadsheet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import PermissionBoundary from "@/components/permission-boundary";
import { notifyError, notifySuccess } from "@/utils/notify";
import SubcategoryFormDialog, {
  SubcategoryFormValues,
} from "@/components/subcategories/subcategory-form";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";
import { useExport } from "@/hooks/use-export";
import {
  createSubcategory,
  deleteSubcategory,
  getSubcategoryById,
  listSubcategories,
  updateSubcategory,
} from "@/services/subcategories";
import { getAllCategoriesDropdown } from "@/services/dropdowns";

type SubcategoryRow = {
  id: string;
  name: string;
  description: string;
  cat_id: string;
  categoryName: string;
  active: boolean;
  createdAt: string;
};

const ALL_CATEGORIES_VALUE = "__all__";

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="secondary"
      className={
        active
          ? "bg-green-200 text-green-800 hover:bg-green-200"
          : "bg-gray-200 text-muted-foreground hover:bg-gray-200"
      }
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

export default function SubcategoriesPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [rows, setRows] = React.useState<SubcategoryRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [page, setPage] = React.useState(1);
  const limit = 10;
  const [pagination, setPagination] = React.useState<any | null>(null);

  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [filterCatId, setFilterCatId] = React.useState<string>(ALL_CATEGORIES_VALUE);

  const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([]);

  const [openForm, setOpenForm] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit" | "view">("create");
  const [current, setCurrent] = React.useState<SubcategoryFormValues | undefined>(undefined);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<SubcategoryRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const canList = useHasPermission(ENTITY_PERMS.subcategories.list);
  const canCreate = useHasPermission(ENTITY_PERMS.subcategories.create);
  const canRead = useHasPermission(ENTITY_PERMS.subcategories.read);
  const canUpdate = useHasPermission(ENTITY_PERMS.subcategories.update);
  const canDelete = useHasPermission(ENTITY_PERMS.subcategories.delete);

  const { isExporting, exportToCSV } = useExport();

  const normalizeRows = React.useCallback(
    (subcategories: any[]): SubcategoryRow[] =>
      subcategories.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description ?? "",
        cat_id: s.cat_id,
        categoryName: s.category?.name ?? "—",
        active: s.is_active ?? false,
        createdAt: s.created_at,
      })),
    []
  );

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQuery, filterCatId]);

  React.useEffect(() => {
    if (!mounted) return;
    (async () => {
      try {
        const list = await getAllCategoriesDropdown();
        setCategories((list ?? []).map((c: { label: string; value: string }) => ({ id: c.value, name: c.label })));
      } catch (e: any) {
        console.error(e);
      }
    })();
  }, [mounted]);

  React.useEffect(() => {
    if (!mounted) return;
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        if (!canList) {
          setRows([]);
          setPagination(null);
          return;
        }
        const { rows: list, pagination: pg } = await listSubcategories(
          page,
          limit,
          debouncedQuery || undefined,
          filterCatId && filterCatId !== ALL_CATEGORIES_VALUE ? filterCatId : undefined,
          { signal: ac.signal }
        );
        setRows(normalizeRows(list));
        setPagination(pg ?? null);
      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.message === "canceled") return;
        console.error(e);
        notifyError(e?.response?.data?.message || "Failed to load subcategories");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [mounted, canList, page, limit, debouncedQuery, filterCatId, normalizeRows]);

  const renderCreatedAt = (iso: string) => {
    if (!mounted) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const refetch = React.useCallback(async () => {
    if (!canList) return;
    const { rows: list, pagination: pg } = await listSubcategories(
      page,
      limit,
      debouncedQuery || undefined,
      filterCatId && filterCatId !== ALL_CATEGORIES_VALUE ? filterCatId : undefined
    );
    setRows(normalizeRows(list));
    setPagination(pg ?? null);
  }, [canList, page, limit, debouncedQuery, filterCatId, normalizeRows]);

  const openCreate = () => {
    if (!canCreate) return;
    setFormMode("create");
    setCurrent(undefined);
    setOpenForm(true);
  };

  const openView = async (s: SubcategoryRow) => {
    if (!canRead) return;
    try {
      const res = await getSubcategoryById(s.id);
      setFormMode("view");
      setCurrent({
        id: res.id,
        name: res.name,
        description: res.description ?? "",
        cat_id: res.cat_id,
        active: res.is_active ?? true,
      });
      setOpenForm(true);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Failed to open subcategory");
    }
  };

  const openEdit = async (s: SubcategoryRow) => {
    if (!canUpdate) return;
    try {
      const res = await getSubcategoryById(s.id);
      setFormMode("edit");
      setCurrent({
        id: res.id,
        name: res.name,
        description: res.description ?? "",
        cat_id: res.cat_id,
        active: res.is_active ?? true,
      });
      setOpenForm(true);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Failed to open subcategory");
    }
  };

  const upsert = async (data: SubcategoryFormValues) => {
    try {
      if (formMode === "create") {
        if (!canCreate) return;
        await createSubcategory({
          name: data.name,
          description: data.description || undefined,
          cat_id: data.cat_id,
          isActive: data.active,
        });
        notifySuccess("Subcategory created");
      } else {
        if (!canUpdate) return;
        await updateSubcategory({
          id: data.id,
          name: data.name,
          description: data.description || undefined,
          cat_id: data.cat_id,
          isActive: data.active,
        });
        notifySuccess("Subcategory updated");
      }

      await refetch();
      setOpenForm(false);
      setCurrent(undefined);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Save failed");
    }
  };

  const requestRemove = (s: SubcategoryRow) => {
    if (!canDelete) return;
    setDeleteTarget(s);
    setDeleteOpen(true);
  };

  const confirmRemove = async () => {
    if (!canDelete) return;
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await deleteSubcategory(deleteTarget.id);
      notifySuccess("Subcategory deleted");

      const { rows: list, pagination: pg } = await listSubcategories(
        page,
        limit,
        debouncedQuery || undefined,
        filterCatId && filterCatId !== ALL_CATEGORIES_VALUE ? filterCatId : undefined
      );
      if ((list?.length ?? 0) === 0 && page > 1) {
        setPage((p) => p - 1);
      } else {
        setRows(normalizeRows(list));
        setPagination(pg ?? null);
      }

      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const pagTotal = pagination?.total ?? rows.length;
  const pagPage = pagination?.page ?? page;
  const totalPages =
    (pagination?.totalPages ?? Math.ceil(pagTotal / limit)) || 1;

  const pagHasPrev = pagination?.hasPrev ?? pagPage > 1;
  const pagHasNext = pagination?.hasNext ?? pagPage < totalPages;

  const exportRows = React.useCallback(() => {
    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      category: s.categoryName,
      active: s.active,
      created_at: s.createdAt,
    }));
  }, [rows]);

  const handleExportCSV = React.useCallback(async () => {
    try {
      if (!canList) return;
      const data = exportRows();
      if (!data.length) {
        notifyError("No subcategories to export");
        return;
      }
      await exportToCSV(data, "subcategories");
    } catch (e: any) {
      console.error(e);
      notifyError("Export failed");
    }
  }, [canList, exportRows, exportToCSV]);

  const handleExportExcel = React.useCallback(async () => {
    try {
      if (!canList) return;
      const data = exportRows();
      if (!data.length) {
        notifyError("No subcategories to export");
        return;
      }

      const headers = Object.keys(data[0] || {});
      const escape = (v: any) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const table = `\n        <table>\n          <thead>\n            <tr>${headers
        .map((h) => `<th>${escape(h)}</th>`)
        .join("")}</tr>\n          </thead>\n          <tbody>\n            ${data
        .map(
          (row) =>
            `<tr>${headers
              .map((h) => `<td>${escape((row as any)[h])}</td>`)
              .join("")}</tr>`
        )
        .join("\n")}\n          </tbody>\n        </table>\n      `;

      const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>${table}</body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "subcategories.xls";
      link.click();
    } catch (e: any) {
      console.error(e);
      notifyError("Export failed");
    }
  }, [canList, exportRows]);

  return (
    <PermissionBoundary screen="/dashboard/subcategories" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Subcategories</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage subcategories under categories
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              className="gap-2 w-full sm:w-auto"
              onClick={openCreate}
              disabled={!canCreate}
            >
              <Plus className="h-4 w-4" />
              Add Subcategory
            </Button>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-xl sm:text-2xl">All Subcategories</CardTitle>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative w-full sm:w-[260px] md:w-[320px] lg:w-[350px] max-w-full">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 pl-9 w-full"
                    placeholder="Search subcategories..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <Select value={filterCatId} onValueChange={setFilterCatId}>
                  <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CATEGORIES_VALUE}>All categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2"
                      disabled={!canList || isExporting}
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
                      <Download className="h-4 w-4" />
                      Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportExcel} className="gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Export Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-6">
            <div className="mt-1 rounded-xl border overflow-hidden overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow className="bg-gray-200">
                    <TableHead className="rounded-tl-xl px-4 py-3">Subcategory</TableHead>
                    <TableHead className="px-4 py-3">Category</TableHead>
                    <TableHead className="px-4 py-3">Description</TableHead>
                    <TableHead className="px-4 py-3">Status</TableHead>
                    <TableHead className="px-4 py-3">Created At</TableHead>
                    <TableHead className="text-right rounded-tr-xl px-4 py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-8 text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading subcategories…
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !canList ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
                        You don&apos;t have permission to view subcategories.
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="grid h-10 w-10 place-items-center rounded-full bg-muted">
                            <SearchX className="h-5 w-5 text-muted-foreground" />
                          </span>
                          <div className="text-sm font-semibold text-foreground">No subcategories found</div>
                          <div className="text-xs text-muted-foreground">Try a different search or filter.</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((s, idx) => {
                      const isLast = idx === rows.length - 1;
                      return (
                        <TableRow
                          key={s.id}
                          className="odd:bg-muted/30 even:bg-white hover:bg-transparent"
                        >
                          <TableCell className={`${isLast ? "rounded-bl-xl" : ""} px-4 py-3`}>
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-md bg-muted">
                                <FolderTree className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="font-medium truncate">{s.name}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                            {s.categoryName}
                          </TableCell>

                          <TableCell className="px-4 py-3">
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {s.description || "—"}
                            </div>
                          </TableCell>

                          <TableCell className="px-4 py-3">
                            <StatusBadge active={s.active} />
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground px-4 py-3">
                            {renderCreatedAt(s.createdAt)}
                          </TableCell>

                          <TableCell className={`text-right ${isLast ? "rounded-br-xl" : ""} px-4 py-3`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                {canRead && (
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => openView(s)}
                                  >
                                    <Eye className="h-4 w-4" />
                                    View
                                  </DropdownMenuItem>
                                )}
                                {canUpdate && (
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => openEdit(s)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {canDelete && (
                                  <DropdownMenuItem
                                    className="gap-2 text-destructive focus:text-destructive"
                                    onClick={() => requestRemove(s)}
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <SubcategoryFormDialog
          open={openForm}
          onOpenChange={(v) => {
            setOpenForm(v);
            if (!v) setCurrent(undefined);
          }}
          mode={formMode}
          initial={current}
          categories={categories}
          onSubmit={upsert}
        />

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={(v) => {
            if (!v) setDeleteTarget(null);
            setDeleteOpen(v);
          }}
          title="Delete subcategory"
          description={deleteTarget ? `Are you sure you want to delete subcategory "${deleteTarget.name}"? This action cannot be undone.` : "This action cannot be undone."}
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
