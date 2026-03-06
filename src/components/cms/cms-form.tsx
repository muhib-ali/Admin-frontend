"use client";

import * as React from "react";
import { Plus, Trash2, ImageIcon, Link as LinkIcon, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ImageSource = "upload" | "link";

export type CmsSubSectionForm = {
  id: string;
  label: string;
  title: string;
  description: string;
  imageSource: ImageSource;
  imageUrl: string;
};

export type CmsFormValues = {
  id?: string;
  section_key: string;
  label: string;
  title: string;
  description: string;
  sectionImageSource: ImageSource;
  sectionImageUrl: string;
  subsections: CmsSubSectionForm[];
};

function ImageFieldBlock({
  imageSource,
  imageUrl,
  onSourceChange,
  onUrlChange,
  disabled,
  namePrefix,
  onUpload,
  uploading,
}: {
  imageSource: ImageSource;
  imageUrl: string;
  onSourceChange: (v: ImageSource) => void;
  onUrlChange: (v: string) => void;
  disabled?: boolean;
  namePrefix?: string;
  onUpload?: (file: File) => void | Promise<void>;
  uploading?: boolean;
}) {
  const name = namePrefix ? `img-src-${namePrefix}` : "img-src";
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    onUpload(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <Label>Image</Label>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={name}
            checked={imageSource === "upload"}
            onChange={() => onSourceChange("upload")}
            disabled={disabled}
            className="rounded border-gray-300"
          />
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Upload</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={name}
            checked={imageSource === "link"}
            onChange={() => onSourceChange("link")}
            disabled={disabled}
            className="rounded border-gray-300"
          />
          <LinkIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Paste link</span>
        </label>
      </div>
      {imageSource === "link" && (
        <Input
          placeholder="https://..."
          value={imageUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          disabled={disabled}
          className="mt-1"
        />
      )}
      {imageSource === "upload" && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          {onUpload ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={disabled || uploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Choose image"
                )}
              </Button>
              {imageUrl && (
                <p className="mt-2 text-xs truncate max-w-full" title={imageUrl}>
                  Saved: {imageUrl}
                </p>
              )}
            </>
          ) : (
            "Upload not available"
          )}
        </div>
      )}
    </div>
  );
}

type CmsFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit" | "view";
  initialData?: Partial<CmsFormValues>;
  onSubmit: (values: CmsFormValues) => void;
  submitting?: boolean;
  onUploadImage?: (file: File) => Promise<{ url: string; fileName?: string }>;
};

export default function CmsFormDialog({
  open,
  onOpenChange,
  mode,
  initialData,
  onSubmit,
  submitting = false,
  onUploadImage,
}: CmsFormDialogProps) {
  const [sectionKey, setSectionKey] = React.useState(
    initialData?.section_key ?? ""
  );
  const [label, setLabel] = React.useState(initialData?.label ?? "");
  const [title, setTitle] = React.useState(initialData?.title ?? "");
  const [description, setDescription] = React.useState(
    initialData?.description ?? ""
  );
  const [sectionImageSource, setSectionImageSource] =
    React.useState<ImageSource>(initialData?.sectionImageSource ?? "link");
  const [sectionImageUrl, setSectionImageUrl] = React.useState(
    initialData?.sectionImageUrl ?? ""
  );
  const [subSections, setSubSections] = React.useState<CmsSubSectionForm[]>(
    initialData?.subsections ?? []
  );
  const [uploadingScope, setUploadingScope] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSectionKey(initialData?.section_key ?? "");
    setLabel(initialData?.label ?? "");
    setTitle(initialData?.title ?? "");
    setDescription(initialData?.description ?? "");
    setSectionImageSource(initialData?.sectionImageSource ?? "link");
    setSectionImageUrl(initialData?.sectionImageUrl ?? "");
    setSubSections(
      initialData?.subsections?.length
        ? initialData.subsections.map((s) => ({
            ...s,
            id: s.id || `sub-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          }))
        : []
    );
  }, [initialData, open]);

  const isViewMode = mode === "view";

  const addSubSection = () => {
    setSubSections((prev) => [
      ...prev,
      {
        id: `sub-${Date.now()}`,
        label: "",
        title: "",
        description: "",
        imageSource: "link" as ImageSource,
        imageUrl: "",
      },
    ]);
  };

  const removeSubSection = (id: string) => {
    setSubSections((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSubSection = (
    id: string,
    field: keyof CmsSubSectionForm,
    value: string | ImageSource
  ) => {
    setSubSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSectionImageUpload = React.useCallback(
    async (file: File) => {
      if (!onUploadImage) return;
      setUploadingScope("section");
      try {
        const { url } = await onUploadImage(file);
        setSectionImageUrl(url);
      } finally {
        setUploadingScope(null);
      }
    },
    [onUploadImage]
  );

  const handleSubSectionImageUpload = React.useCallback(
    (subId: string) => async (file: File) => {
      if (!onUploadImage) return;
      setUploadingScope(subId);
      try {
        const { url } = await onUploadImage(file);
        updateSubSection(subId, "imageUrl", url);
      } finally {
        setUploadingScope(null);
      }
    },
    [onUploadImage, updateSubSection]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: initialData?.id,
      section_key: sectionKey,
      label,
      title,
      description,
      sectionImageSource,
      sectionImageUrl,
      subsections: subSections,
    });
  };

  const dialogTitle =
    mode === "create"
      ? "Add CMS Section"
      : mode === "edit"
      ? "Edit CMS Section"
      : "View CMS Section";
  const descriptionText =
    mode === "create"
      ? "Create a new home page section with optional sub-sections."
      : mode === "edit"
      ? "Update section details."
      : "Section details (read-only).";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cms-section-key">Section Key *</Label>
                <Input
                  id="cms-section-key"
                  placeholder="e.g. hero, features, testimonials"
                  value={sectionKey}
                  onChange={(e) => setSectionKey(e.target.value)}
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cms-label">Label</Label>
                <Input
                  id="cms-label"
                  placeholder="Short label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cms-title">Title</Label>
                <Input
                  id="cms-title"
                  placeholder="Section title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cms-desc">Description</Label>
                <Textarea
                  id="cms-desc"
                  placeholder="Section description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  disabled={isViewMode}
                />
              </div>
              <ImageFieldBlock
                imageSource={sectionImageSource}
                imageUrl={sectionImageUrl}
                onSourceChange={setSectionImageSource}
                onUrlChange={setSectionImageUrl}
                disabled={isViewMode}
                namePrefix="section"
                onUpload={onUploadImage ? handleSectionImageUpload : undefined}
                uploading={uploadingScope === "section"}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Sub-sections</span>
            {!isViewMode && (
              <Button type="button" variant="outline" size="sm" onClick={addSubSection}>
                <Plus className="h-4 w-4 mr-2" />
                Add sub-section
              </Button>
            )}
          </div>

          {subSections.length === 0 && (
            <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
              No sub-sections. Click &quot;Add sub-section&quot; to add one.
            </div>
          )}

          {subSections.map((sub) => (
            <Card key={sub.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2">
                <CardTitle className="text-sm">Sub-section</CardTitle>
                {!isViewMode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSubSection(sub.id)}
                    className="text-destructive hover:text-destructive h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    placeholder="Sub-section label"
                    value={sub.label}
                    onChange={(e) =>
                      updateSubSection(sub.id, "label", e.target.value)
                    }
                    disabled={isViewMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="Sub-section title"
                    value={sub.title}
                    onChange={(e) =>
                      updateSubSection(sub.id, "title", e.target.value)
                    }
                    disabled={isViewMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Sub-section description"
                    value={sub.description}
                    onChange={(e) =>
                      updateSubSection(sub.id, "description", e.target.value)
                    }
                    rows={2}
                    disabled={isViewMode}
                  />
                </div>
                <ImageFieldBlock
                  imageSource={sub.imageSource}
                  imageUrl={sub.imageUrl}
                  onSourceChange={(v) =>
                    updateSubSection(sub.id, "imageSource", v)
                  }
                  onUrlChange={(v) => updateSubSection(sub.id, "imageUrl", v)}
                  disabled={isViewMode}
                  namePrefix={sub.id}
                  onUpload={
                    onUploadImage
                      ? handleSubSectionImageUpload(sub.id)
                      : undefined
                  }
                  uploading={uploadingScope === sub.id}
                />
              </CardContent>
            </Card>
          ))}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {!isViewMode && (
              <Button type="submit" disabled={submitting || !sectionKey.trim()}>
                {submitting ? "Saving..." : mode === "create" ? "Create" : "Update"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
