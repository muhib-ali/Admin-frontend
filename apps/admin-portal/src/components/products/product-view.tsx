"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProductRow } from "./product-form";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: ProductRow | null;
  onEdit: (p: ProductRow) => void;
  onDelete: (p: ProductRow) => void;
  svgCardImage: (seed: string) => string;
};

export function ProductView({
  open,
  onOpenChange,
  product,
  onEdit,
  onDelete,
  svgCardImage,
}: Props) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Product Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <div className="text-lg font-semibold">{product.name}</div>
            <div className="text-sm text-muted-foreground">{product.id}</div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">Images</div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {(product.images?.length ? product.images : [product.image])
                .slice(0, 5)
                .map((src, idx) => (
                  <div
                    key={idx}
                    className="shrink-0 w-[140px] overflow-hidden rounded-lg border bg-muted aspect-[4/3]"
                  >
                    <img
                      src={src}
                      alt={`${product.name} ${idx + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = svgCardImage(
                          (product.description || "").trim() || product.name
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
              <div className="font-medium">{product.category.label}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Brand</div>
              <div className="font-medium">{product.brand}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Price</div>
              <div className="font-medium">${product.price.toFixed(2)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Stock</div>
              <div className="font-medium">{product.stock}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="mt-1">
                <Badge
                  variant="secondary"
                  className={
                    product.status === "Active"
                      ? "bg-green-200 text-green-800 hover:bg-green-200"
                      : "bg-gray-200 text-muted-foreground hover:bg-gray-200"
                  }
                >
                  {product.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Description</div>
            <div className="mt-1 text-sm">{product.description || "—"}</div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onEdit(product)} className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => onDelete(product)} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
