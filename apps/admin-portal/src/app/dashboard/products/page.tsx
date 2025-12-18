"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PermissionBoundary from "@/components/permission-boundary";
import { ProductForm } from "@/components/products/product-form";
import { ProductView } from "@/components/products/product-view";
import { ProductCard } from "@/components/products/product-card";
import { CATEGORIES } from "@/components/categories/category-list";
import { svgCardImage, nextProductId } from "@/components/products/product-utils";
import { DUMMY_PRODUCTS } from "@/components/products/product-data";
import type { ProductRow, ProductFormData, CategoryKey } from "@/components/products/product-form";

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [products, setProducts] = React.useState<ProductRow[]>(DUMMY_PRODUCTS);

  const [viewOpen, setViewOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ProductRow | null>(null);

  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<ProductFormData>({
    name: "",
    description: "",
    category: "all",
    brand: "",
    price: "",
    stock: "",
    status: "Active",
    imageDataUrl: "",
    imageFile: null,
    imageFiles: [],
    imageDataUrls: [],
  });

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<CategoryKey | "all">("all");
  const [page, setPage] = React.useState(1);
  const limit = 8;

  React.useEffect(() => {
    const cat = (searchParams?.get("category") || "").toLowerCase();

    const catKey = CATEGORIES.find((c) => c.key === (cat as any))?.key;

    if (catKey) setCategory(catKey);
  }, [searchParams]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) =>
      (category === "all" || p.category.key === category) &&
      (!q ||
        [
          p.id,
          p.name,
          p.category.label,
          p.brand,
          p.status,
        ].some((v) => String(v).toLowerCase().includes(q)))
    );
  }, [query, category, products]);

  React.useEffect(() => setPage(1), [query]);
  React.useEffect(() => setPage(1), [category]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pagPage = Math.min(page, totalPages);
  const pagStart = total === 0 ? 0 : (pagPage - 1) * limit + 1;
  const pagEnd = total === 0 ? 0 : Math.min(pagPage * limit, total);

  const rows = React.useMemo(() => {
    const start = (pagPage - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, pagPage]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      category: "all",
      brand: "",
      price: "",
      stock: "",
      status: "Active",
      imageDataUrl: "",
      imageFile: null,
      imageFiles: [],
      imageDataUrls: [],
    });
    setDialogOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      category: p.category.key,
      brand: p.brand === "—" ? "" : p.brand,
      price: String(p.price),
      stock: String(p.stock),
      status: p.status,
      imageDataUrl: p.images?.[0] ?? p.image,
      imageFile: null,
      imageFiles: [],
      imageDataUrls: (p.images ?? [p.image]).slice(0, 5),
    });
    setDialogOpen(true);
  };

  const openView = (p: ProductRow) => {
    setSelected(p);
    setViewOpen(true);
  };

  const handleDelete = (p: ProductRow) => {
    if (!confirm(`Delete ${p.name}?`)) return;
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
    if (selected?.id === p.id) {
      setSelected(null);
      setViewOpen(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    const name = form.name.trim();
    if (!name) return;
    if (form.category === "all") return;

    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!Number.isFinite(price) || price < 0) return;
    if (!Number.isFinite(stock) || stock < 0) return;

    const cat = CATEGORIES.find((c) => c.key === form.category);
    if (!cat) return;

    setProducts((prev) => {
      const imageSeed = form.description.trim() || name;
      const images =
        form.imageDataUrls.length > 0
          ? form.imageDataUrls.slice(0, 5)
          : [form.imageDataUrl || svgCardImage(imageSeed)];

      if (editingId) {
        return prev.map((p) => {
          if (p.id !== editingId) return p;
          return {
            ...p,
            name,
            description: form.description.trim(),
            category: { key: cat.key, label: cat.label },
            brand: form.brand.trim() || "—",
            price,
            stock,
            status: form.status,
            image: images[0] || p.image,
            images,
          };
        });
      }

      const payload: ProductRow = {
        id: nextProductId(prev),
        name,
        description: form.description.trim(),
        category: { key: cat.key, label: cat.label },
        brand: form.brand.trim() || "—",
        price,
        stock,
        status: form.status,
        createdAt: new Date().toISOString(),
        image: images[0] || svgCardImage(imageSeed),
        images,
      };
      return [payload, ...prev];
    });
    setDialogOpen(false);
  };

  const renderCreatedAt = (iso: string) => {
    if (!mounted) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Products</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your product catalog
            </p>
          </div>

          <Button className="gap-2 w-full sm:w-auto" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        <ProductForm
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingId={editingId}
          form={form}
          setForm={setForm}
          categories={CATEGORIES}
          onSubmit={handleCreate}
        />

        <ProductView
          open={viewOpen}
          onOpenChange={setViewOpen}
          product={selected}
          onEdit={openEdit}
          onDelete={handleDelete}
          svgCardImage={svgCardImage}
        />

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-xl sm:text-2xl">All Products</CardTitle>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as any)}
                >
                  <SelectTrigger className="h-9 w-full sm:w-[200px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

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
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-6">
            {rows.length === 0 ? (
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
                    onDelete={handleDelete}
                    renderCreatedDate={renderCreatedDate}
                    svgCardImage={svgCardImage}
                  />
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
              <div className="text-sm text-muted-foreground">Showing {pagStart} to {pagEnd} of {total} products</div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <Button variant="outline" size="sm" disabled={pagPage <= 1} className="gap-1" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden xs:inline">Previous</span>
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <Button key={pg} variant={pg === pagPage ? "default" : "outline"} size="sm" onClick={() => setPage(pg)} className="w-8 h-8 p-0 text-xs">
                      {pg}
                    </Button>
                  ))}
                </div>

                <Button variant="outline" size="sm" disabled={pagPage >= totalPages} className="gap-1" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  <span className="hidden xs:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionBoundary>
  );
}
