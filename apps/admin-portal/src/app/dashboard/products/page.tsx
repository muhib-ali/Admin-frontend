"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Package, Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PermissionBoundary from "@/components/permission-boundary";

type CategoryKey = "electronics" | "home" | "fashion" | "sports" | "beauty" | "books";

type ProductRow = {
  id: string;
  name: string;
  description: string;
  category: { key: CategoryKey; label: string };
  brand: string;
  price: number;
  stock: number;
  status: "Active" | "Inactive";
  createdAt: string;
  image: string;
  images: string[];
};

const CATEGORIES: Array<{ key: CategoryKey; label: string }> = [
  { key: "electronics", label: "Electronics" },
  { key: "home", label: "Home & Kitchen" },
  { key: "fashion", label: "Fashion" },
  { key: "sports", label: "Sports" },
  { key: "beauty", label: "Beauty" },
  { key: "books", label: "Books" },
];

function svgCardImage(seed: string) {
  const safe = String(seed ?? "");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='900' height='600'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='#0b0f14'/>
        <stop offset='1' stop-color='#1f2937'/>
      </linearGradient>
      <radialGradient id='r' cx='35%' cy='35%' r='70%'>
        <stop offset='0' stop-color='#ef4444' stop-opacity='0.6'/>
        <stop offset='1' stop-color='#000000' stop-opacity='0'/>
      </radialGradient>
    </defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <rect width='100%' height='100%' fill='url(#r)'/>
    <text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' fill='#e5e7eb' font-family='ui-sans-serif,system-ui' font-size='48' font-weight='700'>${safe}</text>
  </svg>`;

  const base64 =
    typeof window === "undefined"
      ? Buffer.from(svg, "utf8").toString("base64")
      : window.btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

function nextProductId(existing: ProductRow[]) {
  const nums = existing
    .map((p) => Number(String(p.id).replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `PRD-${String(max + 1).padStart(4, "0")}`;
}

const DUMMY_PRODUCTS: ProductRow[] = [
  {
    id: "PRD-0001",
    name: "Nova Phone X",
    description: "Flagship smartphone with pro camera and AMOLED display",
    category: { key: "electronics", label: "Electronics" },
    brand: "Nova",
    price: 799.0,
    stock: 42,
    status: "Active",
    createdAt: "2025-12-14T10:15:00Z",
    image: svgCardImage("Flagship smartphone"),
    images: [svgCardImage("Flagship smartphone")],
  },
  {
    id: "PRD-0002",
    name: "Acme Laptop Pro",
    description: "High-performance laptop for creators and developers",
    category: { key: "electronics", label: "Electronics" },
    brand: "Acme",
    price: 1199.99,
    stock: 18,
    status: "Active",
    createdAt: "2025-12-13T12:05:00Z",
    image: svgCardImage("High-performance laptop"),
    images: [svgCardImage("High-performance laptop")],
  },
  {
    id: "PRD-0003",
    name: "Evergreen Blender",
    description: "Powerful blender for smoothies, soups, and sauces",
    category: { key: "home", label: "Home & Kitchen" },
    brand: "Evergreen",
    price: 89.99,
    stock: 0,
    status: "Inactive",
    createdAt: "2025-12-10T15:42:00Z",
    image: svgCardImage("Powerful blender"),
    images: [svgCardImage("Powerful blender")],
  },
  {
    id: "PRD-0004",
    name: "Chef Pan Set",
    description: "Durable non-stick cookware set for everyday cooking",
    category: { key: "home", label: "Home & Kitchen" },
    brand: "Acme",
    price: 129.5,
    stock: 73,
    status: "Active",
    createdAt: "2025-12-08T09:20:00Z",
    image: svgCardImage("Non-stick cookware"),
    images: [svgCardImage("Non-stick cookware")],
  },
  {
    id: "PRD-0005",
    name: "Zenith Jacket",
    description: "Weather-resistant jacket with warm lining",
    category: { key: "fashion", label: "Fashion" },
    brand: "Zenith",
    price: 159.0,
    stock: 11,
    status: "Inactive",
    createdAt: "2025-12-07T18:11:00Z",
    image: svgCardImage("Weather-resistant jacket"),
    images: [svgCardImage("Weather-resistant jacket")],
  },
  {
    id: "PRD-0006",
    name: "Pulse Running Shoes",
    description: "Lightweight shoes designed for daily running",
    category: { key: "sports", label: "Sports" },
    brand: "Pulse",
    price: 129.5,
    stock: 73,
    status: "Active",
    createdAt: "2025-12-06T10:15:00Z",
    image: svgCardImage("Running shoes"),
    images: [svgCardImage("Running shoes")],
  },
  {
    id: "PRD-0007",
    name: "Outdoor Trek Bottle",
    description: "Insulated water bottle for hiking and travel",
    category: { key: "sports", label: "Sports" },
    brand: "Vertex",
    price: 24.0,
    stock: 132,
    status: "Active",
    createdAt: "2025-12-05T08:33:00Z",
    image: svgCardImage("Insulated bottle"),
    images: [svgCardImage("Insulated bottle")],
  },
  {
    id: "PRD-0008",
    name: "Glow Serum",
    description: "Brightening facial serum with vitamin C",
    category: { key: "beauty", label: "Beauty" },
    brand: "Evergreen",
    price: 49.0,
    stock: 22,
    status: "Active",
    createdAt: "2025-12-04T11:02:00Z",
    image: svgCardImage("Brightening serum"),
    images: [svgCardImage("Brightening serum")],
  },
  {
    id: "PRD-0009",
    name: "Noir Fragrance",
    description: "Long-lasting fragrance with woody notes",
    category: { key: "beauty", label: "Beauty" },
    brand: "Nova",
    price: 79.0,
    stock: 6,
    status: "Inactive",
    createdAt: "2025-12-03T12:47:00Z",
    image: svgCardImage("Woody fragrance"),
    images: [svgCardImage("Woody fragrance")],
  },
  {
    id: "PRD-0010",
    name: "Fiction Bestseller",
    description: "Bestselling novel with suspense and drama",
    category: { key: "books", label: "Books" },
    brand: "Acme",
    price: 19.99,
    stock: 250,
    status: "Active",
    createdAt: "2025-12-02T09:20:00Z",
    image: svgCardImage("Bestselling novel"),
    images: [svgCardImage("Bestselling novel")],
  },
  {
    id: "PRD-0011",
    name: "Non-fiction Guide",
    description: "Practical guide for productivity and habits",
    category: { key: "books", label: "Books" },
    brand: "Zenith",
    price: 22.99,
    stock: 80,
    status: "Active",
    createdAt: "2025-12-01T14:09:00Z",
    image: svgCardImage("Productivity guide"),
    images: [svgCardImage("Productivity guide")],
  },
  {
    id: "PRD-0012",
    name: "Nova Dress",
    description: "Elegant dress suitable for events and parties",
    category: { key: "fashion", label: "Fashion" },
    brand: "Nova",
    price: 99.0,
    stock: 15,
    status: "Active",
    createdAt: "2025-11-30T10:15:00Z",
    image: svgCardImage("Elegant dress"),
    images: [svgCardImage("Elegant dress")],
  },
];

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [products, setProducts] = React.useState<ProductRow[]>(DUMMY_PRODUCTS);

  const [viewOpen, setViewOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ProductRow | null>(null);

  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    category: "all" as CategoryKey | "all",
    brand: "",
    price: "",
    stock: "",
    status: "Active" as ProductRow["status"],
    imageDataUrl: "" as string,
    imageFile: null as File | null,
    imageFiles: [] as File[],
    imageDataUrls: [] as string[],
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
      imageDataUrls: (p.images ?? [p.image]).slice(0, 3),
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
          ? form.imageDataUrls.slice(0, 3)
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Product" : "Add Product"}</DialogTitle>
            </DialogHeader>

            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="grid gap-2">
                <Label htmlFor="productName">Name</Label>
                <Input
                  id="productName"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Product name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="productDescription">Description</Label>
                <Textarea
                  id="productDescription"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="productImage">Picture</Label>
                <Input
                  id="productImage"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []).slice(0, 3);
                    if (files.length === 0) {
                      setForm((p) => ({
                        ...p,
                        imageDataUrl: "",
                        imageFile: null,
                        imageFiles: [],
                        imageDataUrls: [],
                      }));
                      return;
                    }

                    const readers = files.map(
                      (file) =>
                        new Promise<string>((resolve) => {
                          const reader = new FileReader();
                          reader.onload = () => {
                            resolve(typeof reader.result === "string" ? reader.result : "");
                          };
                          reader.readAsDataURL(file);
                        })
                    );

                    Promise.all(readers).then((dataUrls) => {
                      const firstUrl = dataUrls[0] ?? "";
                      const firstFile = files[0] ?? null;
                      setForm((p) => ({
                        ...p,
                        imageDataUrl: firstUrl,
                        imageFile: firstFile,
                        imageFiles: files,
                        imageDataUrls: dataUrls,
                      }));
                    });
                  }}
                />
                <div className="text-xs text-muted-foreground">
                  {form.imageFiles.length === 0
                    ? "No images selected (max 3)."
                    : `${form.imageFiles.length} image(s) selected (max 3).`}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((p) => ({ ...p, category: v as any }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="productBrand">Brand</Label>
                <Input
                  id="productBrand"
                  value={form.brand}
                  onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                  placeholder="Brand"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="productPrice">Price</Label>
                  <Input
                    id="productPrice"
                    inputMode="decimal"
                    value={form.price}
                    onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="productStock">Stock</Label>
                  <Input
                    id="productStock"
                    inputMode="numeric"
                    value={form.stock}
                    onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid gap-2 mt-4">
  <Label>Status</Label>

  <div className="rounded-lg border p-4 bg-muted/30">
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        {form.status === "Active" ? "Active" : "Inactive"}
      </p>

      <Switch
        checked={form.status === "Active"}
        onCheckedChange={(v) =>
          setForm((p) => ({
            ...p,
            status: v ? "Active" : "Inactive",
          }))
        }
        
      />
    </div>
  </div>
</div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
                <Button
                  type="submit"
                  disabled={!form.name.trim() || form.category === "all"}
                >
                  {editingId ? "Update" : "Save"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
            </DialogHeader>

            {selected ? (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <div className="text-lg font-semibold">{selected.name}</div>
                  <div className="text-sm text-muted-foreground">{selected.id}</div>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">Images</div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {(selected.images?.length ? selected.images : [selected.image])
                      .slice(0, 3)
                      .map((src, idx) => (
                        <div key={idx} className="overflow-hidden rounded-lg border bg-muted aspect-[4/3]">
                          <img
                            src={src}
                            alt={`${selected.name} ${idx + 1}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src = svgCardImage(
                                (selected.description || "").trim() || selected.name
                              );
                            }}
                          />
                        </div>
                      ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Category</div>
                    <div className="font-medium">{selected.category.label}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Brand</div>
                    <div className="font-medium">{selected.brand}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Price</div>
                    <div className="font-medium">${selected.price.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Stock</div>
                    <div className="font-medium">{selected.stock}</div>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Description</div>
                  <div className="mt-1 text-sm">{selected.description || "—"}</div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => openEdit(selected)} className="gap-2">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" onClick={() => handleDelete(selected)} className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

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
                  <div
                    key={p.id}
                    className="rounded-xl border bg-card overflow-hidden shadow-sm"
                  >
                    <div className="relative aspect-[4/3] w-full bg-muted">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = svgCardImage(
                            (p.description || "").trim() || p.name
                          );
                        }}
                      />
                      <div className="absolute left-3 top-3">
                        <Badge variant={p.status === "Active" ? "default" : "secondary"}>
                          {p.status}
                        </Badge>
                      </div>

                      <div className="absolute right-3 top-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8 bg-background/80 hover:bg-background"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openView(p)}>
                              <Package className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(p)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(p)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{p.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground truncate">
                            {p.id} • {p.brand}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">${p.price.toFixed(2)}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Stock: {p.stock}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Badge variant="outline">{p.category.label}</Badge>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {renderCreatedDate(p.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
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
