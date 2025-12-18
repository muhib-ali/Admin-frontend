"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
