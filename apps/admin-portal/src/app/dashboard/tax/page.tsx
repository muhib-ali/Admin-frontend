"use client";

import * as React from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  BadgePercent,
  Plus,
  Pencil,
  Trash2,
  Eye,
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
import { toast } from "sonner";

import TaxFormDialog, { TaxFormValues } from "@/components/taxes/tax-form";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";
import {
  createTax,
  deleteTax,
  getTaxById,
  listTaxes,
  updateTax,
} from "@/services/taxes";

type TaxRow = {
  id: string;
  title: string;
  rate: number;
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

export default function TaxPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [rows, setRows] = React.useState<TaxRow[]>([]);
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
  const [current, setCurrent] = React.useState<TaxFormValues | undefined>(
    undefined
  );

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<TaxRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const canList = useHasPermission(ENTITY_PERMS.taxes.list);
  const canCreate = useHasPermission(ENTITY_PERMS.taxes.create);
  const canRead = useHasPermission(ENTITY_PERMS.taxes.read);
  const canUpdate = useHasPermission(ENTITY_PERMS.taxes.update);
  const canDelete = useHasPermission(ENTITY_PERMS.taxes.delete);

  const normalizeRows = React.useCallback(
    (taxes: any[]): TaxRow[] => {
      if (!Array.isArray(taxes)) return [];
      return taxes.map((t) => ({
        id: t.id,
        title: t.title,
        rate: typeof t.rate === "number" ? t.rate : Number(t.rate ?? 0),
        active: t.is_active ?? false,
        createdAt: t.created_at,
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
        const { rows: list, pagination: pg } = await listTaxes(
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
        toast.error(e?.response?.data?.message || "Failed to load taxes");
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
    const { rows: list, pagination: pg } = await listTaxes(
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

  const openView = async (t: TaxRow) => {
    if (!canRead) return;
    try {
      const res = await getTaxById(t.id);
      setFormMode("view");
      setCurrent({
        id: res.id,
        title: res.title,
        rate: res.rate,
        active: res.is_active ?? false,
      });
      setOpenForm(true);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to open tax");
    }
  };

  const openEdit = async (t: TaxRow) => {
    if (!canUpdate) return;
    try {
      const res = await getTaxById(t.id);
      setFormMode("edit");
      setCurrent({
        id: res.id,
        title: res.title,
        rate: res.rate,
        active: res.is_active ?? false,
      });
      setOpenForm(true);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to open tax");
    }
  };

  const upsert = async (data: TaxFormValues) => {
    try {
      if (formMode === "create") {
        if (!canCreate) return;
        const payload = {
          title: data.title,
          rate: data.rate,
          is_active: data.active,
        };
        console.log("Creating tax with payload:", payload);
        console.log("Payload type:", typeof payload);
        console.log("Rate type:", typeof payload.rate);
        await createTax(payload);
        toast.success("Tax created");
      } else {
        if (!canUpdate) return;
        const payload = {
          id: data.id,
          title: data.title,
          rate: data.rate,
          is_active: data.active,
        };
        console.log("Updating tax with payload:", payload);
        await updateTax(payload);
        toast.success("Tax updated");
      }

      await refetch();
      setOpenForm(false);
      setCurrent(undefined);
    } catch (e: any) {
      console.error("Tax upsert error:", e);
      console.error("Error response:", e?.response?.data);
      console.error("Error status:", e?.response?.status);
      console.error("Error headers:", e?.response?.headers);
      console.error("Full error object:", e);
      
      let errorMessage = "Save failed";
      
      // Check for validation errors (which might come as arrays)
      if (e?.response?.data?.message && Array.isArray(e.response.data.message)) {
        const validationErrors = e.response.data.message.join(", ");
        if (validationErrors.includes("already exists") || validationErrors.includes("duplicate")) {
          errorMessage = "Tax with this title already exists";
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
          errorMessage = "Tax with this title already exists";
        } else if (errorMsg.includes("already exists")) {
          errorMessage = "Tax with this title already exists";
        } else if (e?.response?.status === 400) {
          errorMessage = errorMsg || "Invalid request data";
        } else {
          errorMessage = errorMsg;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const requestRemove = (t: TaxRow) => {
    if (!canDelete) return;
    setDeleteTarget(t);
    setDeleteOpen(true);
  };

  const confirmRemove = async () => {
    if (!canDelete) return;
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await deleteTax(deleteTarget.id);
      toast.success("Tax deleted");

      const { rows: list, pagination: pg } = await listTaxes(
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
      toast.error(e?.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const pagTotal = pagination?.total ?? rows.length;
  const pagPage = pagination?.page ?? page;
  const totalPages = (pagination?.totalPages ?? Math.ceil(pagTotal / limit)) || 1;

  const pagHasPrev = pagination?.hasPrev ?? pagPage > 1;
  const pagHasNext = pagination?.hasNext ?? pagPage < totalPages;

  return (
    <PermissionBoundary screen="/dashboard/tax" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Taxes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage tax rates and VAT
            </p>
          </div>

          <Button
            className="gap-2 w-full sm:w-auto"
            onClick={openCreate}
            disabled={!canCreate}
          >
            <Plus className="h-4 w-4" />
            Add Tax
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-xl sm:text-2xl">All Taxes</CardTitle>

              <div className="relative w-full sm:w-65 md:w-80 lg:w-87.5 max-w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 pl-9 w-full"
                  placeholder="Search taxes..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-6">
            <div className="mt-1 rounded-xl border overflow-hidden overflow-x-auto">
              <Table className="min-w-190">
                <TableHeader>
                  <TableRow className="bg-gray-200">
                    <TableHead className="rounded-tl-xl">Title</TableHead>
                    <TableHead>Rate</TableHead>
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
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground"
                      >
                        Loading taxes…
                      </TableCell>
                    </TableRow>
                  ) : !canList ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground"
                      >
                        You don't have permission to view taxes.
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No taxes found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((t, idx) => {
                      const isLast = idx === rows.length - 1;
                      return (
                        <TableRow
                          key={t.id}
                          className="odd:bg-muted/30 even:bg-white hover:bg-transparent"
                        >
                          <TableCell className={isLast ? "rounded-bl-xl" : ""}>
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-md bg-muted">
                                <BadgePercent className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {t.title}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {t.id}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-sm">
                            {Number.isFinite(t.rate) ? `${t.rate}%` : "—"}
                          </TableCell>

                          <TableCell>
                            <StatusBadge active={t.active} />
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {renderCreatedAt(t.createdAt)}
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
                                    onClick={() => openView(t)}
                                  >
                                    <Eye className="h-4 w-4" />
                                    View
                                  </DropdownMenuItem>
                                )}
                                {canUpdate && (
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => openEdit(t)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {canDelete && (
                                  <DropdownMenuItem
                                    className="gap-2 text-destructive focus:text-destructive"
                                    onClick={() => requestRemove(t)}
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

        <TaxFormDialog
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
          title="Delete tax"
          description={
            deleteTarget
              ? `Are you sure you want to delete tax “${deleteTarget.title}”? This action cannot be undone.`
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
