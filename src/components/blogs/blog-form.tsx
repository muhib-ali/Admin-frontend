"use client";

import * as React from "react";    
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

import { uploadBlogImage } from "@/services/blogs";

export type BlogFormValues = {
  id: string;
  heading: string;
  paragraph: string;
  blog_img?: string;
  is_active: boolean;
};

type BlogFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit" | "view";
  initialData?: Partial<BlogFormValues>;
  onSubmit: (values: BlogFormValues) => void;
  submitting?: boolean;
};

export default function BlogFormDialog({
  open,
  onOpenChange,
  mode,
  initialData,
  onSubmit,
  submitting = false,
}: BlogFormDialogProps) {
  const [heading, setHeading] = React.useState(initialData?.heading ?? "");
  const [paragraph, setParagraph] = React.useState(initialData?.paragraph ?? "");
  const [blogImg, setBlogImg] = React.useState(initialData?.blog_img ?? "");
  const [active, setActive] = React.useState(initialData?.is_active ?? true);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setHeading(initialData?.heading ?? "");
    setParagraph(initialData?.paragraph ?? "");
    setBlogImg(initialData?.blog_img ?? "");
    setActive(initialData?.is_active ?? true);
  }, [initialData, open]);

  const isViewMode = mode === "view";
  const title =
    mode === "create"
      ? "Create Blog Post"
      : mode === "edit"
      ? "Edit Blog Post"
      : "View Blog Post";
  const description =
    mode === "create"
      ? "Add a new blog post to your website"
      : mode === "edit"
      ? "Update blog post details"
      : "Blog post details";

  const disabled = !heading.trim() || !paragraph.trim();

  const isDisabled = isViewMode || submitting || uploading;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files ?? [])[0];
    if (!file) return;

    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxImageSize = 10 * 1024 * 1024; // 10MB

    if (!allowedImageTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are allowed");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > maxImageSize) {
      toast.error("Image is too large. Maximum size is 10MB");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    (async () => {
      setUploading(true);
      try {
        const { url } = await uploadBlogImage(file);
        setBlogImg(url);
        toast.success("Image uploaded");
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Image upload failed");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    })();
  };

  const removeImage = () => {
    setBlogImg("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blog-heading">Heading *</Label>
            <Input
              id="blog-heading"
              placeholder="Enter blog heading"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              disabled={isDisabled}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="blog-paragraph">Content *</Label>
            <Textarea
              id="blog-paragraph"
              placeholder="Enter blog content"
              value={paragraph}
              onChange={(e) => setParagraph(e.target.value)}
              disabled={isDisabled}
              rows={8}
            />
          </div>

          <div className="space-y-2">
            <Label>Blog Image</Label>

            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isDisabled}
              />

              <div className="flex flex-col items-center gap-3">
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                  disabled={isDisabled}
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading..." : blogImg ? "Replace Image" : "Upload Image"}
                </Button>

                <div className="text-xs text-muted-foreground text-center">
                  {blogImg ? "1 image uploaded" : "No image selected"}
                </div>
              </div>
            </div>

            {blogImg ? (
              <div className="mt-4 rounded-lg bg-gray-800 p-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-900">
                  <img
                    src={blogImg}
                    alt="Blog image preview"
                    className="h-full w-full object-contain"
                  />

                  {!isViewMode && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white hover:bg-red-700"
                      aria-label="Remove image"
                      disabled={isDisabled}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-xs text-muted-foreground">Is Active</p>
              </div>
              <Switch
                checked={active}
                onCheckedChange={setActive}
                disabled={isDisabled}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button
              onClick={() => {
                const payload: BlogFormValues = {
                  id: initialData?.id ?? "",
                  heading: heading.trim(),
                  paragraph: paragraph.trim(),
                  blog_img: blogImg.trim() || undefined,
                  is_active: active,
                };
                onSubmit(payload);
                onOpenChange(false);
              }}
              disabled={disabled || submitting || uploading}
            >
              {mode === "create" ? "Create" : "Update"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
 }
