"use client";

import * as React from "react";
import { Search, ChevronLeft, ChevronRight, Plus, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PermissionBoundary from "@/components/permission-boundary";
import { ProductForm } from "@/components/products/product-form";
import { ProductView } from "@/components/products/product-view";
import { ProductCard } from "@/components/products/product-card";
import { svgCardImage } from "@/components/products/product-utils";
import type {
  BrandOption,
  CategoryOption,
  ProductFormValues,
  ProductRow,
} from "@/components/products/product-form";
import { useHasPermission } from "@/hooks/use-permission";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { toast } from "react-toastify";
import {
  createProduct,
  getProductsBulkUploadState,
  resetProductsBulkUploadState,
  startProductsBulkUploadExcel,
  subscribeProductsBulkUpload,
  deleteProduct,
  deleteProductImage,
  getProductById,
  listProducts,
  updateProduct,
} from "@/services/products";
import {
  getAllBrandsDropdown,
  getAllCategoriesDropdown,
} from "@/services/dropdowns";

export default function ProductsPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const lastBulkToastRef = React.useRef<number>(0);
  const [bulkUploadState, setBulkUploadState] = React.useState(() =>
    getProductsBulkUploadState()
  );

  const [rows, setRows] = React.useState<ProductRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ProductRow | null>(null);

  const [viewOpen, setViewOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ProductRow | null>(null);

  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [current, setCurrent] = React.useState<ProductFormValues | undefined>(
    undefined
  );

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

    (async () => {
      try {
        if (!canList) {
          setRows([]);
          setPagination(null);
          return;
        }
        setLoading(true);
        const { rows: list, pagination: pg } = await listProducts(
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
        toast.error(e?.response?.data?.message || "Failed to load products");
      } finally {
        setLoading(false);
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
    const { rows: list, pagination: pg } = await listProducts(
      page,
      limit,
      debouncedQuery || undefined
    );
    setRows(normalizeRows(list));
    setPagination(pg ?? null);
  }, [canList, page, limit, debouncedQuery, normalizeRows]);

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

  const openEdit = async (p: ProductRow) => {
    if (!canUpdate) return;
    try {
      const res = await getProductById(p.id);
      const url = res.product_img_url ?? null;
      setFormMode("edit");
      setCurrent({
        id: res.id,
        title: res.title,
        description: res.description ?? "",
        price: String(res.price),
        stock_quantity: String(res.stock_quantity ?? 0),
        category_id: res.category_id,
        brand_id: res.brand_id,
        currency: res.currency ?? "USD",
        is_active: Boolean(res.is_active),
        product_img_url: url,
        product_img_fileName: extractFileName(url),
      });
      setFormOpen(true);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to open product");
    }
  };

  const openView = async (p: ProductRow) => {
    if (!canRead) return;
    try {
      const res = await getProductById(p.id);
      setSelected(normalizeRows([res])[0] ?? p);
      setViewOpen(true);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to open product");
    }
  };

  const openCreate = () => {
    if (!canCreate) return;
    setFormMode("create");
    setCurrent(undefined);
    setFormOpen(true);
  };

  const upsert = async (values: ProductFormValues) => {
    const price = Number(values.price);
    const stock = Number(values.stock_quantity);
    if (!Number.isFinite(price) || price < 0) throw new Error("Invalid price");
    if (!Number.isFinite(stock) || stock < 0)
      throw new Error("Invalid stock quantity");

    if (formMode === "create") {
      if (!canCreate) return;
      await createProduct({
        title: values.title,
        description: values.description || "",
        price,
        stock_quantity: stock,
        category_id: values.category_id,
        brand_id: values.brand_id,
        currency: values.currency,
        product_img_url: values.product_img_url ?? null,
        is_active: values.is_active,
      });
      toast.success("Product created");
    } else {
      if (!canUpdate) return;

      const oldFileName = current?.product_img_fileName || null;
      const newFileName = values.product_img_fileName || extractFileName(values.product_img_url ?? null);

      await updateProduct({
        id: String(values.id),
        title: values.title,
        description: values.description || "",
        price,
        stock_quantity: stock,
        category_id: values.category_id,
        brand_id: values.brand_id,
        currency: values.currency,
        product_img_url: values.product_img_url ?? null,
        is_active: values.is_active,
      });
      toast.success("Product updated");

      if (oldFileName && newFileName && oldFileName !== newFileName) {
        try {
          await deleteProductImage(oldFileName);
        } catch (e) {
          console.error(e);
        }
      }
    }

    await refetch();
    setFormOpen(false);
    setCurrent(undefined);
  };

  const remove = async (p: ProductRow) => {
    if (!canDelete) return;

    const ok = window.confirm(`Delete ${p.title}?`);
    if (!ok) return;

    const fileName = extractFileName(p.product_img_url ?? null);

    try {
      await deleteProduct(p.id);
      if (fileName) {
        try {
          await deleteProductImage(fileName);
        } catch (e) {
          console.error(e);
        }
      }
      toast.success("Product deleted");

      const { rows: list, pagination: pg } = await listProducts(
        page,
        limit,
        debouncedQuery || undefined
      );
      if ((list?.length ?? 0) === 0 && page > 1) {
        setPage((pp) => pp - 1);
      } else {
        setRows(normalizeRows(list));
        setPagination(pg ?? null);
      }

      if (selected?.id === p.id) {
        setSelected(null);
        setViewOpen(false);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Delete failed");
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
            <Button className="gap-2 w-full sm:w-auto" onClick={openCreate} disabled={!canCreate}>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        <ProductForm
          open={formOpen}
          onOpenChange={(v) => {
            setFormOpen(v);
            if (!v) setCurrent(undefined);
          }}
          mode={formMode}
          initial={current}
          categories={categories}
          brands={brands}
          onSubmit={upsert}
        />

        <ProductView
          open={viewOpen}
          onOpenChange={setViewOpen}
          product={selected}
          onEdit={openEdit}
          onDelete={remove}
          svgCardImage={svgCardImage}
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
                    onView={openView}
                    onEdit={openEdit}
                    onDelete={remove}
                    renderCreatedDate={renderCreatedDate}
                    svgCardImage={svgCardImage}
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
                    <div className="text-sm text-muted-foreground">
                      Showing {pagStart} to {pagEnd} of {pagTotal} products
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagHasPrev}
                        className="gap-1"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden xs:inline">Previous</span>
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                          (pg) => (
                            <Button
                              key={pg}
                              variant={pg === pagPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(pg)}
                              className="w-8 h-8 p-0 text-xs"
                            >
                              {pg}
                            </Button>
                          )
                        )}
                      </div>

                      <Button
                        variant="outline"
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
