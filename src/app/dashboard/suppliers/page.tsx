"use client";

import * as React from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Users,
  Plus,
  Pencil,
  Trash2,
  Eye,
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import PermissionBoundary from "@/components/permission-boundary";
import { notifyError, notifySuccess } from "@/utils/notify";

import SupplierFormDialog, {
  SupplierFormValues,
} from "@/components/suppliers/supplier-form";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";
import { useExport } from "@/hooks/use-export";
import {
  createSupplier,
  deleteSupplier,
  getSupplierById,
  listSuppliers,
  updateSupplier,
} from "@/services/suppliers";

type SupplierRow = {
  id: string;
  supplier_name: string;
  address: string;
  email: string;
  phone: string;
  active: boolean;
  createdAt: string;
};

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

export default function SuppliersPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [rows, setRows] = React.useState<SupplierRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [page, setPage] = React.useState(1);
  const limit = 5;
  const [pagination, setPagination] = React.useState<any | null>(null);

  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  const [openForm, setOpenForm] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit" | "view">(
    "create"
  );
  const [current, setCurrent] = React.useState<SupplierFormValues | undefined>(
    undefined
  );

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<SupplierRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const canList = useHasPermission(ENTITY_PERMS.suppliers.list);
  const canCreate = useHasPermission(ENTITY_PERMS.suppliers.create);
  const canRead = useHasPermission(ENTITY_PERMS.suppliers.read);
  const canUpdate = useHasPermission(ENTITY_PERMS.suppliers.update);
  const canDelete = useHasPermission(ENTITY_PERMS.suppliers.delete);

  const { isExporting, exportToCSV } = useExport();

  const normalizeRows = React.useCallback(
    (suppliers: any[]): SupplierRow[] => {
      if (!Array.isArray(suppliers)) return [];
      return suppliers.map((s) => ({
        id: s.id,
        supplier_name: s.supplier_name,
        address: s.address || "",
        email: s.email || "",
        phone: s.phone || "",
        active: s.is_active ?? false,
        createdAt: s.created_at,
      }));
    },
    []
  );

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

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
        const { rows: list, pagination: pg } = await listSuppliers(
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
        notifyError(e?.response?.data?.message || "Failed to load suppliers");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [mounted, canList, page, limit, debouncedQuery, normalizeRows]);

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
    const { rows: list, pagination: pg } = await listSuppliers(
      page,
      limit,
      debouncedQuery || undefined
    );
    setRows(normalizeRows(list));
    setPagination(pg ?? null);
  }, [canList, page, limit, debouncedQuery, normalizeRows]);

  const openCreate = () => {
    if (!canCreate) return;
    setFormMode("create");
    setCurrent(undefined);
    setOpenForm(true);
  };

  const openView = async (s: SupplierRow) => {
    if (!canRead) return;
    try {
      const res = await getSupplierById(s.id);
      setFormMode("view");
      setCurrent({
        id: res.id,
        supplier_name: res.supplier_name,
        address: res.address,
        email: res.email,
        phone: res.phone,
        active: res.is_active ?? false,
      });
      setOpenForm(true);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Failed to open supplier");
    }
  };

  const openEdit = async (s: SupplierRow) => {
    if (!canUpdate) return;
    try {
      const res = await getSupplierById(s.id);
      setFormMode("edit");
      setCurrent({
        id: res.id,
        supplier_name: res.supplier_name,
        address: res.address,
        email: res.email,
        phone: res.phone,
        active: res.is_active ?? false,
      });
      setOpenForm(true);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Failed to open supplier");
    }
  };

  const upsert = async (data: SupplierFormValues) => {
    try {
      if (formMode === "create") {
        if (!canCreate) return;
        const payload = {
          supplier_name: data.supplier_name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          is_active: data.active,
        };
        console.log("Creating supplier with payload:", payload);
        await createSupplier(payload);
        notifySuccess("Supplier created");
      } else {
        if (!canUpdate) return;
        const payload = {
          id: data.id,
          supplier_name: data.supplier_name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          is_active: data.active,
        };
        console.log("Updating supplier with payload:", payload);
        await updateSupplier(payload);
        notifySuccess("Supplier updated");
      }

      await refetch();
      setOpenForm(false);
      setCurrent(undefined);
    } catch (e: any) {
      console.error("Supplier upsert error:", e);
      console.error("Error response:", e?.response?.data);
      console.error("Error status:", e?.response?.status);
      console.error("Error headers:", e?.response?.headers);
      console.error("Full error object:", e);
      
      let errorMessage = "Save failed";
      
      // Check for validation errors (which might come as arrays)
      if (e?.response?.data?.message && Array.isArray(e.response.data.message)) {
        const validationErrors = e.response.data.message.join(", ");
        if (validationErrors.includes("already exists") || validationErrors.includes("duplicate")) {
          errorMessage = "Supplier with this name already exists";
        } else {
          errorMessage = validationErrors;
        }
      } else {
        // Check for different possible error message locations
        let errorMsg = e?.response?.data?.message || 
                      e?.response?.message || 
                      e?.message ||
                      "Unknown error occurred";
        
        // Handle case where message might be an array
        if (Array.isArray(errorMsg)) {
          errorMsg = errorMsg.join(", ");
        }
        
        // Special case: if status is 400 and no message, assume it's validation error
        if (e?.response?.status === 400 && (!errorMsg || errorMsg === "Unknown error occurred")) {
          errorMessage = "Supplier with this name already exists";
        } else if (errorMsg.includes("already exists")) {
          errorMessage = "Supplier with this name already exists";
        } else if (e?.response?.status === 400) {
          errorMessage = errorMsg || "Invalid request data";
        } else {
          errorMessage = errorMsg;
        }
      }
      
      notifyError(errorMessage);
    }
  };

  const requestRemove = (s: SupplierRow) => {
    if (!canDelete) return;
    setDeleteTarget(s);
    setDeleteOpen(true);
  };

  const confirmRemove = async () => {
    if (!canDelete) return;
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await deleteSupplier(deleteTarget.id);
      notifySuccess("Supplier deleted");

      const { rows: list, pagination: pg } = await listSuppliers(
        page,
        limit,
        debouncedQuery || undefined
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
  const totalPages = (pagination?.totalPages ?? Math.ceil(pagTotal / limit)) || 1;

  const pagHasPrev = pagination?.hasPrev ?? pagPage > 1;
  const pagHasNext = pagination?.hasNext ?? pagPage < totalPages;

  const exportRows = React.useCallback(() => {
    return rows.map((s) => ({
      id: s.id,
      supplier_name: s.supplier_name,
      address: s.address,
      email: s.email,
      phone: s.phone,
      active: s.active,
      created_at: s.createdAt,
    }));
  }, [rows]);

  const handleExportCSV = React.useCallback(async () => {
    try {
      if (!canList) return;
      const data = exportRows();
      if (!data.length) {
        notifyError("No suppliers to export");
        return;
      }
      await exportToCSV(data, "suppliers");
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
        notifyError("No suppliers to export");
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
      link.download = "suppliers.xls";
      link.click();
    } catch (e: any) {
      console.error(e);
      notifyError("Export failed");
    }
  }, [canList, exportRows]);

  return (
    <PermissionBoundary screen="/dashboard/suppliers" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Suppliers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage suppliers and contact details
            </p>
          </div>

          <Button
            className="gap-2 w-full sm:w-auto"
            onClick={openCreate}
            disabled={!canCreate}
          >
            <Plus className="h-4 w-4" />
            Add Supplier
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-xl sm:text-2xl">All Suppliers</CardTitle>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative w-full sm:w-65 md:w-80 lg:w-87.5 max-w-full">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 pl-9 w-full"
                    placeholder="Search suppliers..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
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
              <Table className="min-w-245">
                <TableHeader>
                  <TableRow className="bg-gray-200">
                    <TableHead className="rounded-tl-xl">Supplier</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right rounded-tr-xl">
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
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading suppliers…
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !canList ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="p-8 text-center text-muted-foreground"
                      >
                        You don't have permission to view suppliers.
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No suppliers found.
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
                          <TableCell className={isLast ? "rounded-bl-xl" : ""}>
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-md bg-muted">
                                <Users className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="font-medium truncate">{s.supplier_name}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {s.email || "—"}
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {s.phone || "—"}
                          </TableCell>

                          <TableCell>
                            <StatusBadge active={s.active} />
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {renderCreatedAt(s.createdAt)}
                          </TableCell>

                          <TableCell
                            className={`text-right ${isLast ? "rounded-br-xl" : ""}`}
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
              <div className="text-sm text-muted-foreground">
                Page {pagPage} of {totalPages}
              </div>

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
                  <span className="hidden xs:inline">Previous</span>
                </Button>

                <Button
                  variant="pagination"
                  clickVariant="default"
                  size="sm"
                  disabled={!pagHasNext}
                  className="gap-1"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <span className="hidden xs:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <SupplierFormDialog
          open={openForm}
          onOpenChange={(v) => {
            setOpenForm(v);
            if (!v) setCurrent(undefined);
          }}
          mode={formMode}
          initial={current}
          onSubmit={upsert}
        />

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={(v) => {
            if (!v) setDeleteTarget(null);
            setDeleteOpen(v);
          }}
          title="Delete supplier"
          description={
            deleteTarget
              ? `Are you sure you want to delete supplier "${deleteTarget.supplier_name}"? This action cannot be undone.`
              : "This action cannot be undone."
          }
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
