"use client";

import * as React from "react";
import { Search, ChevronLeft, ChevronRight, MoreHorizontal, Tags, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PermissionBoundary from "@/components/permission-boundary";
import { toast } from "sonner";

type BrandRow = {
  id: string;
  name: string;
  description: string;
  products: number;
  status: "Active" | "Inactive";
  createdAt: string;
};

const DUMMY_BRANDS: BrandRow[] = [
  {
    id: "BR-001",
    name: "Acme",
    description: "",
    products: 24,
    status: "Active",
    createdAt: "2025-12-14T10:15:00Z",
  },
  {
    id: "BR-002",
    name: "Nova",
    description: "",
    products: 12,
    status: "Active",
    createdAt: "2025-12-13T12:05:00Z",
  },
  {
    id: "BR-003",
    name: "Zenith",
    description: "",
    products: 8,
    status: "Inactive",
    createdAt: "2025-12-10T15:42:00Z",
  },
  {
    id: "BR-004",
    name: "Evergreen",
    description: "",
    products: 17,
    status: "Active",
    createdAt: "2025-12-08T09:20:00Z",
  },
  {
    id: "BR-005",
    name: "Pulse",
    description: "",
    products: 6,
    status: "Active",
    createdAt: "2025-12-07T18:11:00Z",
  },
  {
    id: "BR-006",
    name: "Vertex",
    description: "",
    products: 3,
    status: "Inactive",
    createdAt: "2025-12-05T08:33:00Z",
  },
];

type BrandFormValues = {
  id: string;
  name: string;
  description: string;
  products: number;
  status: BrandRow["status"];
};

function nextBrandId(existing: BrandRow[]) {
  const nums = existing
    .map((b) => Number(String(b.id).replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `BR-${String(max + 1).padStart(3, "0")}`;
}

function StatusBadge({ status }: { status: BrandRow["status"] }) {
  return status === "Active" ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>;
}

export default function BrandsPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [brands, setBrands] = React.useState<BrandRow[]>(DUMMY_BRANDS);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"create" | "view" | "edit">(
    "create"
  );
  const [activeBrand, setActiveBrand] = React.useState<BrandRow | null>(null);
  const [form, setForm] = React.useState<BrandFormValues>({
    id: "",
    name: "",
    description: "",
    products: 0,
    status: "Active",
  });

  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const limit = 5;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) =>
      [b.id, b.name, b.status].some((v) => String(v).toLowerCase().includes(q))
    );
  }, [query, brands]);

  React.useEffect(() => setPage(1), [query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pagPage = Math.min(page, totalPages);
  const pagStart = total === 0 ? 0 : (pagPage - 1) * limit + 1;
  const pagEnd = total === 0 ? 0 : Math.min(pagPage * limit, total);

  const rows = React.useMemo(() => {
    const start = (pagPage - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, pagPage]);

  const renderCreatedAt = (iso: string) => {
    if (!mounted) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const openCreate = () => {
    const id = nextBrandId(brands);
    setDialogMode("create");
    setActiveBrand(null);
    setForm({ id, name: "", description: "", products: 0, status: "Active" });
    setDialogOpen(true);
  };

  const openView = (b: BrandRow) => {
    setDialogMode("view");
    setActiveBrand(b);
    setForm({ id: b.id, name: b.name, description: b.description ?? "", products: b.products, status: b.status });
    setDialogOpen(true);
  };

  const openEdit = (b: BrandRow) => {
    setDialogMode("edit");
    setActiveBrand(b);
    setForm({ id: b.id, name: b.name, description: b.description ?? "", products: b.products, status: b.status });
    setDialogOpen(true);
  };

  const handleDelete = (b: BrandRow) => {
    const ok = window.confirm(`Delete brand ${b.name}?`);
    if (!ok) return;
    setBrands((prev) => prev.filter((x) => x.id !== b.id));
    toast.success("Brand deleted");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: BrandRow = {
      id: form.id.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      products: Math.max(0, Number(form.products) || 0),
      status: form.status,
      createdAt: activeBrand?.createdAt ?? new Date().toISOString(),
    };

    if (!payload.name) {
      toast.error("Please enter a brand name");
      return;
    }

    if (dialogMode === "create") {
      setBrands((prev) => [payload, ...prev]);
      toast.success("Brand created");
    } else if (dialogMode === "edit" && activeBrand) {
      setBrands((prev) => prev.map((x) => (x.id === activeBrand.id ? payload : x)));
      toast.success("Brand updated");
    }

    setDialogOpen(false);
  };

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

          <Button className="gap-2 w-full sm:w-auto" onClick={openCreate}>
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
                    <TableHead className="rounded-tl-xl">Brand</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right rounded-tr-xl">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
                        No brands found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((b, idx) => {
                      const isLast = idx === rows.length - 1;
                      return (
                        <TableRow key={b.id} className="odd:bg-muted/30 even:bg-white hover:bg-transparent">
                          <TableCell className={isLast ? "rounded-bl-xl" : ""}>
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-md bg-muted">
                                <Tags className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="font-medium truncate">{b.name}</div>
                                <div className="text-xs text-muted-foreground">{b.id}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>{b.products}</TableCell>

                          <TableCell>
                            <StatusBadge status={b.status} />
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">{renderCreatedAt(b.createdAt)}</TableCell>

                          <TableCell className={`text-right ${isLast ? "rounded-br-xl" : ""}`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem className="cursor-pointer" onClick={() => openView(b)}>
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer" onClick={() => openEdit(b)}>
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="cursor-pointer text-red-600 focus:text-red-600"
                                  onClick={() => handleDelete(b)}
                                >
                                  Delete
                                </DropdownMenuItem>
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
              <div className="text-sm text-muted-foreground">Showing {pagStart} to {pagEnd} of {total} brands</div>

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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>
                {dialogMode === "create"
                  ? "Add Brand"
                  : dialogMode === "edit"
                  ? "Edit Brand"
                  : "View Brand"}
              </DialogTitle>
            </DialogHeader>

            <form className="space-y-4" onSubmit={handleSave}>
              <div className="grid gap-2">
                <Label htmlFor="brandName">Name</Label>
                <Input
                  id="brandName"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  disabled={dialogMode === "view"}
                  placeholder="Brand name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="brandDescription">Description</Label>
                <Textarea
                  id="brandDescription"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  disabled={dialogMode === "view"}
                  rows={3}
                />
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
        disabled={dialogMode === "view"}
      />
    </div>
  </div>
</div>


              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
                {dialogMode !== "view" && <Button type="submit">Save</Button>}
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionBoundary>
  );
}
