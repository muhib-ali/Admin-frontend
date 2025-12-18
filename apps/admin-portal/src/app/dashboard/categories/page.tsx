"use client";

import * as React from "react";
import { Search, ChevronLeft, ChevronRight, MoreHorizontal, FolderTree, Plus } from "lucide-react";

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

type CategoryRow = {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Inactive";
  createdAt: string;
};

const DUMMY_CATEGORIES: CategoryRow[] = [
  {
    id: "CAT-001",
    name: "Electronics",
    description: "",
    status: "Active",
    createdAt: "2025-12-14T10:15:00Z",
  },
  {
    id: "CAT-002",
    name: "Home & Kitchen",
    description: "",
    status: "Active",
    createdAt: "2025-12-13T12:05:00Z",
  },
  {
    id: "CAT-003",
    name: "Fashion",
    description: "",
    status: "Inactive",
    createdAt: "2025-12-10T15:42:00Z",
  },
  {
    id: "CAT-004",
    name: "Sports",
    description: "",
    status: "Active",
    createdAt: "2025-12-08T09:20:00Z",
  },
  {
    id: "CAT-005",
    name: "Beauty",
    description: "",
    status: "Active",
    createdAt: "2025-12-07T18:11:00Z",
  },
  {
    id: "CAT-006",
    name: "Books",
    description: "",
    status: "Inactive",
    createdAt: "2025-12-05T08:33:00Z",
  },
];

type CategoryFormValues = {
  id: string;
  name: string;
  description: string;
  status: CategoryRow["status"];
};

function nextCategoryId(existing: CategoryRow[]) {
  const nums = existing
    .map((c) => Number(String(c.id).replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `CAT-${String(max + 1).padStart(3, "0")}`;
}

function StatusBadge({ status }: { status: CategoryRow["status"] }) {
  return (
    <Badge
      variant="secondary"
      className={
        status === "Active"
          ? "bg-green-200 text-green-800 hover:bg-green-200"
          : "bg-gray-200 text-muted-foreground hover:bg-gray-200"
      }
    >
      {status}
    </Badge>
  );
}

export default function CategoriesPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [categories, setCategories] = React.useState<CategoryRow[]>(DUMMY_CATEGORIES);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"create" | "view" | "edit">(
    "create"
  );
  const [activeCategory, setActiveCategory] = React.useState<CategoryRow | null>(null);
  const [form, setForm] = React.useState<CategoryFormValues>({
    id: "",
    name: "",
    description: "",
    status: "Active",
  });

  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const limit = 5;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) =>
      [c.id, c.name, c.status].some((v) => String(v).toLowerCase().includes(q))
    );
  }, [query, categories]);

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
    const id = nextCategoryId(categories);
    setDialogMode("create");
    setActiveCategory(null);
    setForm({ id, name: "", description: "", status: "Active" });
    setDialogOpen(true);
  };

  const openView = (c: CategoryRow) => {
    setDialogMode("view");
    setActiveCategory(c);
    setForm({ id: c.id, name: c.name, description: c.description ?? "", status: c.status });
    setDialogOpen(true);
  };

  const openEdit = (c: CategoryRow) => {
    setDialogMode("edit");
    setActiveCategory(c);
    setForm({ id: c.id, name: c.name, description: c.description ?? "", status: c.status });
    setDialogOpen(true);
  };

  const handleDelete = (c: CategoryRow) => {
    const ok = window.confirm(`Delete category ${c.name}?`);
    if (!ok) return;
    setCategories((prev) => prev.filter((x) => x.id !== c.id));
    toast.success("Category deleted");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CategoryRow = {
      id: form.id.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
      createdAt: activeCategory?.createdAt ?? new Date().toISOString(),
    };

    if (!payload.name) {
      toast.error("Please enter a category name");
      return;
    }

    if (dialogMode === "create") {
      setCategories((prev) => [payload, ...prev]);
      toast.success("Category created");
    } else if (dialogMode === "edit" && activeCategory) {
      setCategories((prev) => prev.map((x) => (x.id === activeCategory.id ? payload : x)));
      toast.success("Category updated");
    }

    setDialogOpen(false);
  };

  return (
    <PermissionBoundary screen="/dashboard/categories" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Categories</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage product categories
            </p>
          </div>

          <Button className="gap-2 w-full sm:w-auto" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-xl sm:text-2xl">All Categories</CardTitle>

              <div className="relative w-full sm:w-[260px] md:w-[320px] lg:w-[350px] max-w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 pl-9 w-full"
                  placeholder="Search categories..."
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
                    <TableHead className="rounded-tl-xl">Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right rounded-tr-xl">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="p-8 text-center text-muted-foreground">
                        No categories found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((c, idx) => {
                      const isLast = idx === rows.length - 1;
                      return (
                        <TableRow
                          key={c.id}
                          className="odd:bg-muted/30 even:bg-white hover:bg-transparent"
                        >
                          <TableCell className={isLast ? "rounded-bl-xl" : ""}>
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-md bg-muted">
                                <FolderTree className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="font-medium truncate">{c.name}</div>
                                <div className="text-xs text-muted-foreground">{c.id}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <StatusBadge status={c.status} />
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {renderCreatedAt(c.createdAt)}
                          </TableCell>

                          <TableCell className={`text-right ${isLast ? "rounded-br-xl" : ""}`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem className="cursor-pointer" onClick={() => openView(c)}>
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer" onClick={() => openEdit(c)}>
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="cursor-pointer text-red-600 focus:text-red-600"
                                  onClick={() => handleDelete(c)}
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
              <div className="text-sm text-muted-foreground">
                Showing {pagStart} to {pagEnd} of {total} categories
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagPage <= 1}
                  className="gap-1"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden xs:inline">Previous</span>
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <Button
                      key={pg}
                      variant={pg === pagPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pg)}
                      className="w-8 h-8 p-0 text-xs"
                    >
                      {pg}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagPage >= totalPages}
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>
                {dialogMode === "create"
                  ? "Add Category"
                  : dialogMode === "edit"
                  ? "Edit Category"
                  : "View Category"}
              </DialogTitle>
            </DialogHeader>

            <form className="space-y-4" onSubmit={handleSave}>
              <div className="grid gap-2">
                <Label htmlFor="categoryName">Name</Label>
                <Input
                  id="categoryName"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  disabled={dialogMode === "view"}
                  placeholder="Category name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="categoryDescription">Description</Label>
                <Textarea
                  id="categoryDescription"
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
        className="data-[state=checked]:bg-green-600"
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
