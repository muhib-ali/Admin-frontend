"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Plus, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PermissionBoundary from "@/components/permission-boundary";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProductCard } from "@/components/products/product-card";
import { svgCardImage } from "@/components/products/product-utils";
import type {
  BrandOption,
  CategoryOption,
  ProductRow,
} from "@/components/products/product-form";
import { useHasPermission } from "@/hooks/use-permission";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { toast } from "react-toastify";
import {
  getProductsBulkUploadState,
  resetProductsBulkUploadState,
  startProductsBulkUploadExcel,
  subscribeProductsBulkUpload,
  deleteProduct,
  deleteProductImage,
  listProducts,
} from "@/services/products";
import {
  getAllBrandsDropdown,
  getAllCategoriesDropdown,
} from "@/services/dropdowns";

export default function ProductsPage() {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const loadingRef = React.useRef(false);
  const lastFetchRef = React.useRef<{ key: string; at: number } | null>(null);

  const STORAGE_KEY = "admin_portal_static_products_v1";

  const readStoredProducts = React.useCallback((): ProductRow[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? (arr as ProductRow[]) : [];
    } catch {
      return [];
    }
  }, []);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const lastBulkToastRef = React.useRef<number>(0);
  const [bulkUploadState, setBulkUploadState] = React.useState(() =>
    getProductsBulkUploadState()
  );

  const [rows, setRows] = React.useState<ProductRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ProductRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [categories, setCategories] = React.useState<CategoryOption[]>([]);
  const [brands, setBrands] = React.useState<BrandOption[]>([]);

  const [page, setPage] = React.useState(1);
  const limit = 8;
  const [pagination, setPagination] = React.useState<any | null>(null);

  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  const canList = useHasPermission(ENTITY_PERMS.products.list);
  const canCreate = useHasPermission(ENTITY_PERMS.products.create);
  const canRead = useHasPermission(ENTITY_PERMS.products.read);
  const canUpdate = useHasPermission(ENTITY_PERMS.products.update);
  const canDelete = useHasPermission(ENTITY_PERMS.products.delete);

  const extractFileName = React.useCallback((url?: string | null): string | null => {
    if (!url) return null;
    try {
      const u = new URL(url);
      const last = u.pathname.split("/").filter(Boolean).pop();
      return last || null;
    } catch {
      const parts = String(url).split("/").filter(Boolean);
      return parts.length ? parts[parts.length - 1] : null;
    }
  }, []);

  const normalizeRows = React.useCallback((products: any[]): ProductRow[] => {
    return products.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description ?? "",
      price: Number(p.price),
      total_price: p.total_price ? Number(p.total_price) : undefined,
      stock_quantity: Number(p.stock_quantity ?? 0),
      category_id: p.category_id,
      brand_id: p.brand_id,
      currency: p.currency ?? "USD",
      product_img_url: p.product_img_url ?? null,
      sku: p.sku ?? null,
      is_active: Boolean(p.is_active),
      created_at: p.created_at,
      category: p.category ? { id: p.category.id, name: p.category.name } : undefined,
      brand: p.brand ? { id: p.brand.id, name: p.brand.name } : undefined,
    }));
  }, []);

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

    const reqKey = JSON.stringify({ page, limit, q: (debouncedQuery || "").trim() });
    const last = lastFetchRef.current;
    if (last && last.key === reqKey && Date.now() - last.at < 800) {
      return () => ac.abort();
    }
    lastFetchRef.current = { key: reqKey, at: Date.now() };

    (async () => {
      try {
        if (!canList) {
          setRows([]);
          setPagination(null);
          return;
        }
        setLoading(true);
        loadingRef.current = true;
        const { rows: list, pagination: pg } = await listProducts(
          page,
          limit,
          debouncedQuery || undefined,
          { signal: ac.signal }
        );
        const stored = readStoredProducts();
        const combined = [...stored, ...normalizeRows(list)];
        setRows(combined);
        setPagination(pg ?? null);
      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.message === "canceled") return;
        console.error(e);
        toast.error(e?.response?.data?.message || "Failed to load products");
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    })();

    return () => ac.abort();
  }, [mounted, canList, page, limit, debouncedQuery, normalizeRows]);

  React.useEffect(() => {
    if (!mounted) return;
    (async () => {
      try {
        const [cats, brs] = await Promise.all([
          getAllCategoriesDropdown(),
          getAllBrandsDropdown(),
        ]);

        setCategories((cats ?? []).map((c: any) => ({ id: c.value, name: c.label })));
        setBrands((brs ?? []).map((b: any) => ({ id: b.value, name: b.label })));
      } catch (e: any) {
        console.error(e);
        toast.error("Failed to load categories/brands");
      }
    })();
  }, [mounted]);

  const refetch = React.useCallback(async () => {
    if (!canList) return;
    if (loadingRef.current) return;
    const { rows: list, pagination: pg } = await listProducts(
      page,
      limit,
      debouncedQuery || undefined
    );
    const stored = readStoredProducts();
    const combined = [...stored, ...normalizeRows(list)];
    setRows(combined);
    setPagination(pg ?? null);
  }, [canList, page, limit, debouncedQuery, normalizeRows, readStoredProducts]);

  React.useEffect(() => {
    if (!mounted) return;
    return subscribeProductsBulkUpload(setBulkUploadState);
  }, [mounted]);

  React.useEffect(() => {
    if (!mounted) return;
    if (bulkUploadState.status === "success") {
      if (bulkUploadState.finishedAt <= lastBulkToastRef.current) return;
      lastBulkToastRef.current = bulkUploadState.finishedAt;

      const { createdCount, failedCount } = bulkUploadState.result;
      if (createdCount > 0) {
        toast.success(
          `Bulk upload successful: ${createdCount} created${failedCount ? `, ${failedCount} failed` : ""}`
        );
      } else {
        toast.error(
          `Bulk upload completed: 0 created${failedCount ? `, ${failedCount} failed` : ""}`
        );
      }

      (async () => {
        try {
          await refetch();
        } catch {
          // ignore
        } finally {
          resetProductsBulkUploadState();
        }
      })();
    }

    if (bulkUploadState.status === "error") {
      if (bulkUploadState.finishedAt <= lastBulkToastRef.current) return;
      lastBulkToastRef.current = bulkUploadState.finishedAt;
      toast.error(bulkUploadState.error || "Bulk upload failed");
      resetProductsBulkUploadState();
    }
  }, [mounted, bulkUploadState, refetch]);

  const triggerExcelPick = () => {
    if (!canCreate) return;
    if (bulkUploadState.status === "uploading") return;
    fileInputRef.current?.click();
  };

  const onExcelSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files ?? [])[0];
    if (!file) return;

    try {
      const name = file.name.toLowerCase();
      if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
        throw new Error("Only .xlsx or .xls files are allowed");
      }

      startProductsBulkUploadExcel(file);
    } catch (err: any) {
      toast.error(err?.message || "Bulk upload failed");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const goToView = (p: ProductRow) => {
    if (!canRead) return;
    router.push(`/dashboard/products/view/${p.id}`);
  };

  const goToEdit = (p: ProductRow) => {
    if (!canUpdate) return;
    router.push(`/dashboard/products/edit/${p.id}`);
  };

  const goToCreate = () => {
    if (!canCreate) return;
    router.push("/dashboard/products/new");
  };

  const requestRemove = (p: ProductRow) => {
    if (!canDelete) return;
    setDeleteTarget(p);
    setDeleteOpen(true);
  };

  const confirmRemove = async () => {
    if (!canDelete) return;
    if (!deleteTarget) return;

    const p = deleteTarget;
    const fileName = extractFileName(p.product_img_url ?? null);

    try {
      setDeleting(true);
      await deleteProduct(p.id);
      if (fileName) {
        try {
          await deleteProductImage(fileName);
        } catch (e) {
          console.error(e);
        }
      }
      toast.success("Product deleted");

      try {
        const stored = readStoredProducts();
        const nextStored = stored.filter((x) => x.id !== p.id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStored));
      } catch {
        // ignore
      }

      await refetch();

      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const renderCreatedDate = (iso: string) => {
    if (!mounted) return "—";
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  return (
    <PermissionBoundary screen="/dashboard/products" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={onExcelSelected}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Products</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your product catalog
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className="gap-2 w-full sm:w-auto bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 hover:border-emerald-300"
              onClick={triggerExcelPick}
              disabled={!canCreate || bulkUploadState.status === "uploading"}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {bulkUploadState.status === "uploading" ? "Uploading…" : "Upload Excel"}
            </Button>
            <Button className="gap-2 w-full sm:w-auto" onClick={goToCreate} disabled={!canCreate}>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={(v) => {
            if (!v) setDeleteTarget(null);
            setDeleteOpen(v);
          }}
          title="Delete product"
          description={deleteTarget ? `Are you sure you want to delete “${deleteTarget.title}”? This action cannot be undone.` : "This action cannot be undone."}
          confirmText="Delete"
          cancelText="Cancel"
          destructive
          loading={deleting}
          onConfirm={confirmRemove}
        />

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-xl sm:text-2xl">All Products</CardTitle>

              <div className="relative w-full sm:w-[260px] md:w-[320px] lg:w-[350px] max-w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 pl-9 w-full"
                  placeholder="Search products..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-6">
            {bulkUploadState.status === "uploading" ? (
              <div className="mt-1 rounded-xl border bg-gradient-to-br from-emerald-50 to-white p-10">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing Excel upload
                  </div>
                  <div className="text-sm text-muted-foreground max-w-md">
                    Your products are being uploaded. You can navigate to other pages and keep working.
                    When you come back, this loader will stay here until the upload finishes.
                  </div>
                  <div className="mt-3 w-full max-w-md">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                      <div className="h-2 w-1/2 animate-pulse rounded-full bg-emerald-500" />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      File: {bulkUploadState.fileName}
                    </div>
                  </div>
                </div>
              </div>
            ) : loading ? (
              <div className="mt-1 rounded-xl border p-10 text-center text-muted-foreground">
                Loading products…
              </div>
            ) : !canList ? (
              <div className="mt-1 rounded-xl border p-10 text-center text-muted-foreground">
                You don't have permission to view products.
              </div>
            ) : rows.length === 0 ? (
              <div className="mt-1 rounded-xl border p-10 text-center text-muted-foreground">
                No products found.
              </div>
            ) : (
              <div className="mt-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rows.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onView={goToView}
                    onEdit={goToEdit}
                    onDelete={requestRemove}
                    renderCreatedDate={renderCreatedDate}
                    svgCardImage={svgCardImage}
                    canRead={canRead}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                  />
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
              {(() => {
                const pagTotal = pagination?.total ?? rows.length;
                const pagPage = pagination?.page ?? page;
                const totalPages =
                  (pagination?.totalPages ?? Math.ceil(pagTotal / limit)) || 1;

                const pagHasPrev = pagination?.hasPrev ?? pagPage > 1;
                const pagHasNext = pagination?.hasNext ?? pagPage < totalPages;

                const pagStart = pagTotal === 0 ? 0 : (pagPage - 1) * limit + 1;
                const pagEnd =
                  pagTotal === 0 ? 0 : Math.min(pagPage * limit, pagTotal);

                return (
                  <>
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
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionBoundary>
  );
}
