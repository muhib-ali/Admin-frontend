"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Upload, ChevronLeft, ChevronRight, X } from "lucide-react";
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

export type CategoryKey = "electronics" | "home" | "fashion" | "sports" | "beauty" | "books";

export type ProductFormData = {
  name: string;
  description: string;
  category: CategoryKey | "all";
  brand: string;
  price: string;
  stock: string;
  status: "Active" | "Inactive";
  imageDataUrl: string;
  imageFile: File | null;
  imageFiles: File[];
  imageDataUrls: string[];
};

export type ProductRow = {
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

export type Category = {
  key: CategoryKey;
  label: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingId: string | null;
  form: ProductFormData;
  setForm: React.Dispatch<React.SetStateAction<ProductFormData>>;
  categories: Category[];
  onSubmit: (e: React.FormEvent) => void;
};

export function ProductForm({
  open,
  onOpenChange,
  editingId,
  form,
  setForm,
  categories,
  onSubmit,
}: Props) {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);

    if (files.length > 5) {
      toast.error("More than 5 images cannot be uploaded.", { autoClose: 3000 });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

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
      const validDataUrls = dataUrls.filter((u) => typeof u === "string" && u.length > 0);

      setForm((p) => ({
        ...p,
        imageDataUrl: validDataUrls[0] ?? "",
        imageFile: files[0] ?? null,
        imageFiles: files,
        imageDataUrls: validDataUrls,
      }));

      setCurrentImageIndex(0);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  };

  React.useEffect(() => {
    if (currentImageIndex > Math.max(0, form.imageDataUrls.length - 1)) {
      setCurrentImageIndex(0);
    }
  }, [currentImageIndex, form.imageDataUrls.length]);

  const removeImage = (index: number) => {
    setForm((p) => {
      const newFiles = p.imageFiles.filter((_, i) => i !== index);
      const newDataUrls = p.imageDataUrls.filter((_, i) => i !== index);
      return {
        ...p,
        imageFiles: newFiles,
        imageDataUrls: newDataUrls,
        imageDataUrl: newDataUrls[0] ?? "",
        imageFile: newFiles[0] ?? null,
      };
    });
    if (currentImageIndex >= form.imageDataUrls.length - 1) {
      setCurrentImageIndex(Math.max(0, form.imageDataUrls.length - 2));
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev < form.imageDataUrls.length - 1 ? prev + 1 : 0
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev > 0 ? prev - 1 : form.imageDataUrls.length - 1
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
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
            
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6">
              <input
                ref={fileInputRef}
                id="productImage"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <div className="flex flex-col items-center gap-3">
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-red-600 hover:bg-red-700 text-white gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Images
                </Button>
                <div className="text-xs text-muted-foreground text-center">
                  {form.imageFiles.length === 0
                    ? "No images selected (max 5)"
                    : `${form.imageFiles.length} image(s) selected (max 5)`}
                </div>
              </div>
            </div>

            {form.imageDataUrls.length > 0 && (
              <div className="mt-4 rounded-lg bg-gray-800 p-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-900">
                  <img
                    src={form.imageDataUrls[currentImageIndex]}
                    alt={`Preview ${currentImageIndex + 1}`}
                    className="h-full w-full object-contain"
                  />
                  
                  <button
                    type="button"
                    onClick={() => removeImage(currentImageIndex)}
                    className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white hover:bg-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {form.imageDataUrls.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-gray-700/80 p-2 text-white hover:bg-gray-600"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-gray-700/80 p-2 text-white hover:bg-gray-600"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {form.imageDataUrls.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`h-2 w-2 rounded-full transition-all ${
                          idx === currentImageIndex
                            ? "bg-white w-6"
                            : "bg-gray-500 hover:bg-gray-400"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-3 text-center text-sm text-gray-300">
                  Image {currentImageIndex + 1} of {form.imageDataUrls.length}
                </div>
              </div>
            )}
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
                {categories.map((c) => (
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
                  className="data-[state=checked]:bg-green-600"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
  );
}
