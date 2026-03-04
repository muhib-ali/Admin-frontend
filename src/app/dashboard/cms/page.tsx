"use client";

import * as React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import CmsFormDialog, {
  type CmsFormValues,
} from "@/components/cms/cms-form";
import { notifyError, notifySuccess } from "@/utils/notify";
import {
  listCmsSections,
  getCmsSectionById,
  createCmsSection,
  updateCmsSection,
  deleteCmsSection,
  uploadCmsImage,
  type CmsSectionRow,
} from "@/services/cms";

type CmsRow = {
  id: string;
  section_key: string;
  label: string | null;
  title: string | null;
  subsections_count: number;
};

function mapSectionToRow(s: CmsSectionRow): CmsRow {
  return {
    id: s.id,
    section_key: s.section_key,
    label: s.label ?? null,
    title: s.title ?? null,
    subsections_count: s.subsections_count ?? s.subsections?.length ?? 0,
  };
}

function mapSectionToFormValues(s: CmsSectionRow): Partial<CmsFormValues> {
  return {
    id: s.id,
    section_key: s.section_key,
    label: s.label ?? "",
    title: s.title ?? "",
    description: s.description ?? "",
    sectionImageSource: "link",
    sectionImageUrl: s.section_img_url ?? "",
    subsections: (s.subsections ?? []).map((sub) => ({
      id: sub.id,
      label: sub.label ?? "",
      title: sub.title ?? "",
      description: sub.description ?? "",
      imageSource: "link" as const,
      imageUrl: sub.section_img_url ?? "",
    })),
  };
}

export default function CmsPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [rows, setRows] = React.useState<CmsRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [openForm, setOpenForm] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit" | "view">(
    "create"
  );
  const [current, setCurrent] = React.useState<Partial<CmsFormValues> | undefined>(
    undefined
  );
  const [submitting, setSubmitting] = React.useState(false);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<CmsRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const loadList = React.useCallback(async () => {
    try {
      setLoading(true);
      const { rows: list } = await listCmsSections(1, 100);
      setRows(list.map(mapSectionToRow));
    } catch (e: unknown) {
      console.error(e);
      notifyError((e as any)?.response?.data?.message || "Failed to load CMS sections");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    loadList();
  }, [mounted, loadList]);

  const handleCreate = () => {
    setCurrent(undefined);
    setFormMode("create");
    setOpenForm(true);
  };

  const handleView = async (row: CmsRow) => {
    try {
      const data = await getCmsSectionById(row.id);
      setCurrent(mapSectionToFormValues(data));
      setFormMode("view");
      setOpenForm(true);
    } catch (e: unknown) {
      console.error(e);
      notifyError((e as any)?.response?.data?.message || "Failed to load section");
    }
  };

  const handleEdit = async (row: CmsRow) => {
    try {
      const data = await getCmsSectionById(row.id);
      setCurrent(mapSectionToFormValues(data));
      setFormMode("edit");
      setOpenForm(true);
    } catch (e: unknown) {
      console.error(e);
      notifyError((e as any)?.response?.data?.message || "Failed to load section");
    }
  };

  const handleDeleteClick = (row: CmsRow) => {
    setDeleteTarget(row);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteCmsSection(deleteTarget.id);
      notifySuccess("Section deleted successfully");
      setDeleteOpen(false);
      setDeleteTarget(null);
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    } catch (e: unknown) {
      console.error(e);
      notifyError((e as any)?.response?.data?.message || "Failed to delete section");
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSubmit = (values: CmsFormValues) => {
    void (async () => {
      try {
        setSubmitting(true);
        if (formMode === "create") {
          const created = await createCmsSection({
            section_key: values.section_key,
            label: values.label || undefined,
            title: values.title || undefined,
            description: values.description || undefined,
            section_img_url: values.sectionImageUrl || undefined,
            subsections: values.subsections?.map((s, i) => ({
              subsection_key: `sub_${i + 1}`,
              label: s.label || undefined,
              title: s.title || undefined,
              description: s.description || undefined,
              section_img_url: s.imageUrl || undefined,
              sort_order: i + 1,
            })),
          });
          notifySuccess("Section created successfully");
          setRows((prev) => [
            ...prev,
            {
              id: created.id,
              section_key: created.section_key,
              label: created.label ?? null,
              title: created.title ?? null,
              subsections_count: created.subsections?.length ?? 0,
            },
          ]);
          setOpenForm(false);
        } else if (formMode === "edit" && values.id) {
          await updateCmsSection(values.id, {
            section_key: values.section_key,
            label: values.label || undefined,
            title: values.title || undefined,
            description: values.description || undefined,
            section_img_url: values.sectionImageUrl || undefined,
            subsections: values.subsections?.map((s, i) => ({
              subsection_key: `sub_${i + 1}`,
              label: s.label || undefined,
              title: s.title || undefined,
              description: s.description || undefined,
              section_img_url: s.imageUrl || undefined,
              sort_order: i + 1,
            })),
          });
          notifySuccess("Section updated successfully");
          await loadList();
          setOpenForm(false);
        }
      } catch (e: unknown) {
        console.error(e);
        notifyError(
          (e as any)?.response?.data?.message || "Failed to save section"
        );
      } finally {
        setSubmitting(false);
      }
    })();
  };

  return (
    <div className="p-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Home CMS</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage home page sections and sub-sections.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sections</CardTitle>
            <p className="text-sm text-muted-foreground">
              List of CMS sections. Create, edit, view, or delete.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section Key</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-24">Sub-sections</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-8"
                      >
                        No sections yet. Click &quot;Add Section&quot; to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {row.section_key}
                        </TableCell>
                        <TableCell>{row.label ?? "—"}</TableCell>
                        <TableCell>{row.title ?? "—"}</TableCell>
                        <TableCell>{row.subsections_count}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(row)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(row)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(row)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CmsFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        mode={formMode}
        initialData={current}
        onSubmit={handleFormSubmit}
        submitting={submitting}
        onUploadImage={uploadCmsImage}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete section"
        description={`Are you sure you want to delete section "${deleteTarget?.section_key}"? This will remove the section and all its sub-sections.`}
        confirmText="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
