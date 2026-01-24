"use client";

import * as React from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Tags,
  Plus,
  Pencil,
  Trash2,
  SearchX,
  Loader2,
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
import PermissionBoundary from "@/components/permission-boundary";
import { notifyError, notifySuccess } from "@/utils/notify";
import BrandFormDialog, {
  BrandFormValues,
} from "@/components/brands/brand-form";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";
import {
  createBrand,
  deleteBrand,
  getBrandById,
  listBrands,
  updateBrand,
} from "@/services/brands";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type BrandRow = {
  id: string;
  name: string;
  description: string;
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

export default function BrandsPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [rows, setRows] = React.useState<BrandRow[]>([]);
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
  const [current, setCurrent] = React.useState<BrandFormValues | undefined>(
    undefined
  );

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<BrandRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const canList = useHasPermission(ENTITY_PERMS.brands.list);
  const canCreate = useHasPermission(ENTITY_PERMS.brands.create);
  const canRead = useHasPermission(ENTITY_PERMS.brands.read);
  const canUpdate = useHasPermission(ENTITY_PERMS.brands.update);
  const canDelete = useHasPermission(ENTITY_PERMS.brands.delete);

  const normalizeRows = React.useCallback(
    (brands: any[]): BrandRow[] =>
      brands.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description ?? "",
        active: b.is_active ?? false,
        createdAt: b.created_at,
      })),
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
        const { rows: list, pagination: pg } = await listBrands(
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
        notifyError(e?.response?.data?.message || "Failed to load brands");
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
    const { rows: list, pagination: pg } = await listBrands(
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

  const openView = async (b: BrandRow) => {
    if (!canRead) return;
    try {
      const res = await getBrandById(b.id);
      setFormMode("view");
      setCurrent({
        id: res.id,
        name: res.name,
        description: res.description ?? "",
        isActive: res.is_active ?? true,
      });
      setOpenForm(true);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Failed to open brand");
    }
  };

  const openEdit = async (b: BrandRow) => {
    if (!canUpdate) return;
    try {
      const res = await getBrandById(b.id);
      setFormMode("edit");
      setCurrent({
        id: res.id,
        name: res.name,
        description: res.description ?? "",
        isActive: res.is_active ?? true,
      });
      setOpenForm(true);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Failed to open brand");
    }
  };

  const upsert = async (data: BrandFormValues) => {
    try {
      if (formMode === "create") {
        if (!canCreate) return;
        await createBrand({
          name: data.name,
          description: data.description || "",
          isActive: data.isActive,
        });
        notifySuccess("Brand created");
      } else {
        if (!canUpdate) return;
        await updateBrand({
          id: data.id,
          name: data.name,
          description: data.description || "",
          isActive: data.isActive,
        });
        notifySuccess("Brand updated");
      }

      await refetch();
      setOpenForm(false);
      setCurrent(undefined);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Save failed");
    }
  };

  const requestRemove = (b: BrandRow) => {
    if (!canDelete) return;
    setDeleteTarget(b);
    setDeleteOpen(true);
  };

  const confirmRemove = async () => {
    if (!canDelete) return;
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await deleteBrand(deleteTarget.id);
      notifySuccess("Brand deleted");

      const { rows: list, pagination: pg } = await listBrands(
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
  const totalPages =
    (pagination?.totalPages ?? Math.ceil(pagTotal / limit)) || 1;

  const pagHasPrev = pagination?.hasPrev ?? pagPage > 1;
  const pagHasNext = pagination?.hasNext ?? pagPage < totalPages;

  const pagStart = pagTotal === 0 ? 0 : (pagPage - 1) * limit + 1;
  const pagEnd = pagTotal === 0 ? 0 : Math.min(pagPage * limit, pagTotal);

  return (
    <PermissionBoundary screen="/dashboard/brands" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Brands</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage product brands
            </p>
          </div>

          <Button
            className="gap-2 w-full sm:w-auto"
            onClick={openCreate}
            disabled={!canCreate}
          >
            <Plus className="h-4 w-4" />
            Add Brand
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-xl sm:text-2xl">All Brands</CardTitle>

              <div className="relative w-full sm:w-[260px] md:w-[320px] lg:w-[350px] max-w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 pl-9 w-full"
                  placeholder="Search brands..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-6">
            <div className="mt-1 rounded-xl border overflow-hidden overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow className="bg-gray-200">
                    <TableHead className="rounded-tl-xl px-4 py-3">Brand</TableHead>
                    <TableHead className="px-4 py-3">Description</TableHead>
                    <TableHead className="px-4 py-3">Status</TableHead>
                    <TableHead className="px-4 py-3">Created At</TableHead>
                    <TableHead className="text-right rounded-tr-xl px-4 py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-8 text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading brands…
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !canList ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
                        You don't have permission to view brands.
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="grid h-10 w-10 place-items-center rounded-full bg-muted">
                            <SearchX className="h-5 w-5 text-muted-foreground" />
                          </span>
                          <div className="text-sm font-semibold text-foreground">Brand not found</div>
                          <div className="text-xs text-muted-foreground">Try a different search term.</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((b, idx) => {
                      const isLast = idx === rows.length - 1;
                      return (
                        <TableRow key={b.id} className="odd:bg-muted/30 even:bg-white hover:bg-transparent">
                          <TableCell className={`${isLast ? "rounded-bl-xl" : ""} px-4 py-3`}>
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-md bg-muted">
                                <Tags className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="font-medium truncate">{b.name}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground px-4 py-3">
                            {b.description || "—"}
                          </TableCell>

                          <TableCell className="px-4 py-3">
                            <StatusBadge active={b.active} />
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground px-4 py-3">
                            {renderCreatedAt(b.createdAt)}
                          </TableCell>

                          <TableCell className={`text-right ${isLast ? "rounded-br-xl" : ""} px-4 py-3`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                {canUpdate && (
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => openEdit(b)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {canDelete && (
                                  <DropdownMenuItem
                                    className="gap-2 text-destructive focus:text-destructive"
                                    onClick={() => requestRemove(b)}
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
                <Button variant="pagination" clickVariant="default" size="sm" disabled={!pagHasPrev} className="gap-1" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden xs:inline">Previous</span>
                </Button>

                <Button variant="pagination" clickVariant="default" size="sm" disabled={!pagHasNext} className="gap-1" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  <span className="hidden xs:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <BrandFormDialog
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
          title="Delete brand"
          description={deleteTarget ? `Are you sure you want to delete brand “${deleteTarget.name}”? This action cannot be undone.` : "This action cannot be undone."}
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
