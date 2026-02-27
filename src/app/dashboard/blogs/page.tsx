"use client";

import * as React from "react";
import Image from "next/image";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  FileText,
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

import BlogFormDialog, { BlogFormValues } from "@/components/blogs/blog-form";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";
import { useExport } from "@/hooks/use-export";
import {
  createBlog,
  deleteBlog,
  getBlogById,
  listBlogs,
  updateBlog,
  toggleBlogActive,
} from "@/services/blogs";

type BlogRow = {
  id: string;
  heading: string;
  paragraph: string;
  blog_img?: string;
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

export default function BlogsPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [rows, setRows] = React.useState<BlogRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [page, setPage] = React.useState(1);
  const limit = 10;
  const [pagination, setPagination] = React.useState<any | null>(null);

  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  const [openForm, setOpenForm] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit" | "view">(
    "create"
  );
  const [current, setCurrent] = React.useState<BlogFormValues | undefined>(
    undefined
  );
  const [submitting, setSubmitting] = React.useState(false);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<BlogRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const canList = useHasPermission(ENTITY_PERMS.blogs.list);
  const canCreate = useHasPermission(ENTITY_PERMS.blogs.create);
  const canRead = useHasPermission(ENTITY_PERMS.blogs.read);
  const canUpdate = useHasPermission(ENTITY_PERMS.blogs.update);
  const canDelete = useHasPermission(ENTITY_PERMS.blogs.delete);

  const { isExporting, exportToCSV } = useExport();

  const normalizeRows = React.useCallback(
    (blogs: any[]): BlogRow[] => {
      if (!Array.isArray(blogs)) return [];
      return blogs.map((b) => ({
        id: b.id,
        heading: b.heading,
        paragraph: b.paragraph,
        blog_img: b.blog_img,
        active: b.is_active ?? false,
        createdAt: b.created_at,
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
        const { rows: list, pagination: pg } = await listBlogs(
          page,
          limit,
          debouncedQuery || undefined,
          undefined,
          { signal: ac.signal }
        );
        setRows(normalizeRows(list));
        setPagination(pg ?? null);
      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.message === "canceled") return;
        console.error(e);
        notifyError(e?.response?.data?.message || "Failed to load blogs");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [mounted, page, limit, debouncedQuery, canList, normalizeRows]);

  const handleCreate = () => {
    setCurrent(undefined);
    setFormMode("create");
    setOpenForm(true);
  };

  const handleView = async (row: BlogRow) => {
    if (!canRead) return;
    try {
      const data = await getBlogById(row.id);
      setCurrent({
        id: data.id,
        heading: data.heading,
        paragraph: data.paragraph,
        blog_img: data.blog_img,
        is_active: data.is_active,
      });
      setFormMode("view");
      setOpenForm(true);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Failed to load blog");
    }
  };

  const handleEdit = async (row: BlogRow) => {
    if (!canUpdate) return;
    try {
      const data = await getBlogById(row.id);
      setCurrent({
        id: data.id,
        heading: data.heading,
        paragraph: data.paragraph,
        blog_img: data.blog_img,
        is_active: data.is_active,
      });
      setFormMode("edit");
      setOpenForm(true);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Failed to load blog");
    }
  };

  const handleToggleActive = async (row: BlogRow) => {
    if (!canUpdate) return;
    try {
      await toggleBlogActive(row.id);
      notifySuccess("Blog status updated successfully");
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, active: !r.active } : r))
      );
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Failed to toggle blog status");
    }
  };

  const handleDeleteClick = (row: BlogRow) => {
    if (!canDelete) return;
    setDeleteTarget(row);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!canDelete) return;
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteBlog(deleteTarget.id);
      notifySuccess("Blog deleted successfully");
      setDeleteOpen(false);
      setDeleteTarget(null);
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Failed to delete blog");
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSubmit = (values: BlogFormValues) => {
    void (async () => {
      try {
        setSubmitting(true);
        if (formMode === "create") {
          if (!canCreate) return;
          const created = await createBlog(values);
          notifySuccess("Blog created successfully");
          setRows((prev) => [
            {
              id: created.id,
              heading: created.heading,
              paragraph: created.paragraph,
              blog_img: created.blog_img,
              active: created.is_active,
              createdAt: created.created_at,
            },
            ...prev,
          ]);
        } else if (formMode === "edit" && values.id) {
          if (!canUpdate) return;
          const updated = await updateBlog({
            id: values.id,
            heading: values.heading,
            paragraph: values.paragraph,
            blog_img: values.blog_img,
            is_active: values.is_active,
          });
          notifySuccess("Blog updated successfully");
          setRows((prev) =>
            prev.map((r) =>
              r.id === updated.id
                ? {
                    id: updated.id,
                    heading: updated.heading,
                    paragraph: updated.paragraph,
                    blog_img: updated.blog_img,
                    active: updated.is_active,
                    createdAt: updated.created_at,
                  }
                : r
            )
          );
        }
        setCurrent(undefined);
      } catch (e: any) {
        console.error(e);
        notifyError(
          e?.response?.data?.message ||
            `Failed to ${formMode === "create" ? "create" : "update"} blog`
        );
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const totalPages = pagination?.totalPages ?? 1;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const exportRows = React.useCallback(() => {
    return rows.map((b) => ({
      id: b.id,
      heading: b.heading,
      paragraph: b.paragraph,
      blog_img: b.blog_img || "",
      active: b.active,
      created_at: b.createdAt,
    }));
  }, [rows]);

  const handleExportCSV = React.useCallback(async () => {
    try {
      if (!canList) return;
      const data = exportRows();
      if (!data.length) {
        notifyError("No blogs to export");
        return;
      }
      await exportToCSV(data, "blogs");
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
        notifyError("No blogs to export");
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
      link.download = "blogs.xls";
      link.click();
    } catch (e: any) {
      console.error(e);
      notifyError("Export failed");
    }
  }, [canList, exportRows]);

  return (
    <PermissionBoundary screen="/dashboard/blogs" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Blogs</h1>
            <p className="text-muted-foreground">
              Manage your blog posts and content
            </p>
          </div>
          <Button onClick={handleCreate} disabled={!canCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Blog
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Blog Posts
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search blogs..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2 bg-emerald-100 border border-emerald-200 px-3 text-xs font-medium text-emerald-700 shadow-sm transition duration-150 hover:border-emerald-600 hover:bg-emerald-600 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-200 active:translate-y-px"
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
          <CardContent>
            <div className="mt-1 rounded-xl border overflow-hidden overflow-x-auto">
              <Table className="min-w-210">
                <TableHeader>
                  <TableRow className="bg-gray-200">
                    <TableHead className="rounded-tl-xl">Heading</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Content Preview</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right rounded-tr-xl">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading blogs…
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !canList ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
                        You don't have permission to view blogs.
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
                        {debouncedQuery ? "No blogs found." : "No blogs yet."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row, idx) => {
                      const isLast = idx === rows.length - 1;
                      return (
                        <TableRow
                          key={row.id}
                          className="odd:bg-muted/30 even:bg-white hover:bg-transparent"
                        >
                          <TableCell className={isLast ? "rounded-bl-xl" : ""}>
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-md bg-muted">
                                <FileText className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="font-medium truncate max-w-50">
                                  {row.heading}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            {row.blog_img ? (
                              <Image
                                src={row.blog_img}
                                alt={row.heading}
                                width={48}
                                height={48}
                                className="object-cover rounded-md border"
                              />
                            ) : (
                              <div className="h-12 w-12 bg-muted rounded-md border flex items-center justify-center">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            <div className="truncate max-w-75">{row.paragraph}</div>
                          </TableCell>

                          <TableCell>
                            <StatusBadge active={row.active} />
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(row.createdAt).toLocaleDateString()}
                          </TableCell>

                          <TableCell className={"text-right " + (isLast ? "rounded-br-xl" : "")}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                {canRead && (
                                  <DropdownMenuItem className="gap-2" onClick={() => handleView(row)}>
                                    <Eye className="h-4 w-4" />
                                    View
                                  </DropdownMenuItem>
                                )}
                                {canUpdate && (
                                  <DropdownMenuItem className="gap-2" onClick={() => handleEdit(row)}>
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {canDelete && (
                                  <DropdownMenuItem
                                    className="gap-2 text-destructive focus:text-destructive"
                                    onClick={() => handleDeleteClick(row)}
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

            {pagination && pagination.total > limit && (
              <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to{" "}
                  {Math.min(page * limit, pagination.total)} of{" "}
                  {pagination.total} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!hasPrev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {page} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasNext}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <BlogFormDialog
          open={openForm}
          onOpenChange={setOpenForm}
          mode={formMode}
          initialData={current}
          onSubmit={handleFormSubmit}
          submitting={submitting}
        />

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete Blog"
          description={`Are you sure you want to delete "${deleteTarget?.heading}"? This action cannot be undone.`}
          onConfirm={handleDeleteConfirm}
          loading={deleting}
        />
      </div>
    </PermissionBoundary>
  );
}
