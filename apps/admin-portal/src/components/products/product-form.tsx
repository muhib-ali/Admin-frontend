"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Upload, X } from "lucide-react";
import { toast } from "react-toastify";
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
import { deleteProductImage, uploadProductImage } from "@/services/products";

export type CategoryOption = {
  id: string;
  name: string;
};

export type BrandOption = {
  id: string;
  name: string;
};

export type ProductRow = {
  id: string;
  title: string;
  description: string;
  price: number;
  stock_quantity: number;
  category_id: string;
  brand_id: string;
  currency: string;
  product_img_url?: string | null;
  sku?: string | null;
  is_active: boolean;
  created_at: string;
  category?: { id: string; name: string };
  brand?: { id: string; name: string };
};

export type ProductFormValues = {
  id?: string;
  title: string;
  description: string;
  price: string;
  stock_quantity: string;
  category_id: string;
  brand_id: string;
  currency: string;
  is_active: boolean;
  product_img_url?: string | null;
  product_img_fileName?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: ProductFormValues;
  categories: CategoryOption[];
  brands: BrandOption[];
  onSubmit: (values: ProductFormValues) => Promise<void> | void;
};

export function ProductForm({
  open,
  onOpenChange,
  mode,
  initial,
  categories,
  brands,
  onSubmit,
}: Props) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadedThisSessionFileName, setUploadedThisSessionFileName] =
    React.useState<string | null>(null);
  const [uploadedThisSessionUrl, setUploadedThisSessionUrl] = React.useState<
    string | null
  >(null);

  const [values, setValues] = React.useState<ProductFormValues>(() => ({
    id: initial?.id,
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    price: initial?.price ?? "",
    stock_quantity: initial?.stock_quantity ?? "",
    category_id: initial?.category_id ?? "",
    brand_id: initial?.brand_id ?? "",
    currency: initial?.currency ?? "USD",
    is_active: initial?.is_active ?? true,
    product_img_url: initial?.product_img_url ?? null,
    product_img_fileName: initial?.product_img_fileName ?? null,
  }));

  const initialRef = React.useRef<ProductFormValues | undefined>(undefined);
  React.useEffect(() => {
    if (!open) return;

    initialRef.current = initial;

    setValues({
      id: initial?.id,
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      price: initial?.price ?? "",
      stock_quantity: initial?.stock_quantity ?? "",
      category_id: initial?.category_id ?? "",
      brand_id: initial?.brand_id ?? "",
      currency: initial?.currency ?? "USD",
      is_active: initial?.is_active ?? true,
      product_img_url: initial?.product_img_url ?? null,
      product_img_fileName: initial?.product_img_fileName ?? null,
    });
    setUploadedThisSessionFileName(null);
    setUploadedThisSessionUrl(null);
  }, [open, initial]);

  const isDirty = React.useMemo(() => {
    const i = initialRef.current;
    const imgUrl = uploadedThisSessionUrl ?? values.product_img_url ?? null;
    const imgName =
      uploadedThisSessionFileName ?? values.product_img_fileName ?? null;

    if (!i) {
      return Boolean(
        values.title.trim() ||
          values.description.trim() ||
          values.price.trim() ||
          values.stock_quantity.trim() ||
          values.category_id ||
          values.brand_id ||
          values.currency ||
          imgUrl ||
          imgName
      );
    }

    return (
      values.title !== i.title ||
      values.description !== i.description ||
      values.price !== i.price ||
      values.stock_quantity !== i.stock_quantity ||
      values.category_id !== i.category_id ||
      values.brand_id !== i.brand_id ||
      values.currency !== i.currency ||
      values.is_active !== i.is_active ||
      imgUrl !== (i.product_img_url ?? null) ||
      imgName !== (i.product_img_fileName ?? null) ||
      Boolean(uploadedThisSessionFileName)
    );
  }, [values, uploadedThisSessionFileName, uploadedThisSessionUrl]);

  const extractFileName = (url?: string | null): string | null => {
    if (!url) return null;
    try {
      const u = new URL(url);
      const last = u.pathname.split("/").filter(Boolean).pop();
      return last || null;
    } catch {
      const parts = String(url).split("/").filter(Boolean);
      return parts.length ? parts[parts.length - 1] : null;
    }
  };

  const handleOpenChange = async (v: boolean) => {
    if (v) {
      onOpenChange(true);
      return;
    }

    if (!isDirty && !uploadedThisSessionFileName) {
      onOpenChange(false);
      return;
    }

    const ok = window.confirm(
      "Close this form? Your unsaved changes will be lost."
    );
    if (!ok) return;

    if (uploadedThisSessionFileName) {
      try {
        await deleteProductImage(uploadedThisSessionFileName);
      } catch (e: any) {
        console.error(e);
      }
    }

    onOpenChange(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files ?? [])[0];
    if (!file) {
      return;
    }

    (async () => {
      setUploading(true);
      try {
        if (uploadedThisSessionFileName) {
          try {
            await deleteProductImage(uploadedThisSessionFileName);
          } catch (err) {
            console.error(err);
          }
        }

        const uploadId =
          mode === "edit" ? String(values.id) : crypto.randomUUID();

        const { url, fileName } = await uploadProductImage(uploadId, file);
        setUploadedThisSessionUrl(url);
        setUploadedThisSessionFileName(fileName);

        setValues((p) => ({
          ...p,
          product_img_url: url,
          product_img_fileName: fileName,
        }));
        toast.success("Image uploaded");
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Image upload failed", { autoClose: 3000 });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    })();
  };

  const removeImage = async () => {
    if (uploadedThisSessionFileName) {
      try {
        await deleteProductImage(uploadedThisSessionFileName);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to delete image", { autoClose: 3000 });
      }
    }

    setUploadedThisSessionFileName(null);
    setUploadedThisSessionUrl(null);
    setValues((p) => ({
      ...p,
      product_img_url: null,
      product_img_fileName: null,
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const title = values.title.trim();
    if (!title) {
      toast.error("Please enter a product title", { autoClose: 3000 });
      return;
    }
    if (!values.category_id) {
      toast.error("Please select a category", { autoClose: 3000 });
      return;
    }
    if (!values.brand_id) {
      toast.error("Please select a brand", { autoClose: 3000 });
      return;
    }

    const price = Number(values.price);
    const stock = Number(values.stock_quantity);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Please enter a valid price", { autoClose: 3000 });
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      toast.error("Please enter a valid stock quantity", { autoClose: 3000 });
      return;
    }

    try {
      setSaving(true);
      await onSubmit({
        ...values,
        title,
        product_img_url: uploadedThisSessionUrl ?? values.product_img_url ?? null,
        product_img_fileName:
          uploadedThisSessionFileName ?? values.product_img_fileName ?? null,
      });
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Save failed", { autoClose: 3000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor="productTitle">Title</Label>
            <Input
              id="productTitle"
              value={values.title}
              onChange={(e) =>
                setValues((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Product title"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="productDescription">Description</Label>
            <Textarea
              id="productDescription"
              value={values.description}
              onChange={(e) =>
                setValues((p) => ({ ...p, description: e.target.value }))
              }
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="productImage">Picture</Label>
            
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6">
              <input
                ref={fileInputRef}
                id="productImage"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <div className="flex flex-col items-center gap-3">
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-red-600 hover:bg-red-700 text-white gap-2"
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload Image"}
                </Button>
                <div className="text-xs text-muted-foreground text-center">
                  {values.product_img_url
                    ? "1 image selected"
                    : "No image selected"}
                </div>
              </div>
            </div>

            {values.product_img_url && (
              <div className="mt-4 rounded-lg bg-gray-800 p-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-900">
                  <img
                    src={values.product_img_url}
                    alt="Preview"
                    className="h-full w-full object-contain"
                  />

                  <button
                    type="button"
                    onClick={() => removeImage()}
                    className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white hover:bg-red-700"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 text-center text-xs text-gray-300">
                  {extractFileName(values.product_img_url) || "Image"}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={values.category_id}
                onValueChange={(v) =>
                  setValues((p) => ({ ...p, category_id: v }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Brand</Label>
              <Select
                value={values.brand_id}
                onValueChange={(v) =>
                  setValues((p) => ({ ...p, brand_id: v }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="productPrice">Price</Label>
              <Input
                id="productPrice"
                inputMode="decimal"
                value={values.price}
                onChange={(e) =>
                  setValues((p) => ({ ...p, price: e.target.value }))
                }
                placeholder="0"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="productStock">Stock</Label>
              <Input
                id="productStock"
                inputMode="numeric"
                value={values.stock_quantity}
                onChange={(e) =>
                  setValues((p) => ({ ...p, stock_quantity: e.target.value }))
                }
                placeholder="0"
              />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label>Currency</Label>
              <Select
                value={values.currency}
                onValueChange={(v) => setValues((p) => ({ ...p, currency: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="PKR">PKR</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2 mt-4">
            <Label>Status</Label>

            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {values.is_active ? "Active" : "Inactive"}
                </p>

                <Switch
                  checked={values.is_active}
                  onCheckedChange={(v) => setValues((p) => ({ ...p, is_active: v }))}
                  className="data-[state=checked]:bg-green-600"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Close
            </Button>
            <Button
              type="submit"
              disabled={
                saving ||
                uploading ||
                !values.title.trim() ||
                !values.category_id ||
                !values.brand_id
              }
            >
              {saving ? "Saving..." : mode === "edit" ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
