"use client";

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
  canUpdate?: boolean;
  canDelete?: boolean;
};

function ImagePreview({
  url,
  productTitle,
  productDescription,
  svgCardImage,
}: {
  url?: string | null;
  productTitle: string;
  productDescription?: string;
  svgCardImage: (seed: string) => string;
}) {
  const seed = (productDescription || "").trim() || productTitle;
  const src = url || svgCardImage(seed);

  return (
    <div className="grid gap-2">
      <div className="text-sm font-medium">Image</div>
      <div className="overflow-hidden rounded-lg border bg-muted aspect-[16/9]">
        <img
          src={src}
          alt={productTitle}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = svgCardImage(seed);
          }}
        />
      </div>
    </div>
  );
}

export function ProductView({
  open,
  onOpenChange,
  product,
  onEdit,
  onDelete,
  svgCardImage,
  canUpdate = true,
  canDelete = true,
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
            <div className="text-lg font-semibold">{product.title}</div>
            <div className="text-sm text-muted-foreground">{product.id}</div>
          </div>

          <ImagePreview
            url={product.product_img_url}
            productTitle={product.title}
            productDescription={product.id}
            svgCardImage={svgCardImage}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Category</div>
              <div className="font-medium">{product.category?.name ?? "—"}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Brand</div>
              <div className="font-medium">{product.brand?.name ?? "—"}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Price</div>
              <div className="font-medium">${product.price.toFixed(2)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Stock</div>
              <div className="font-medium">{product.stock_quantity}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="mt-1">
                <Badge
                  variant="secondary"
                  className={
                    product.is_active
                      ? "bg-green-200 text-green-800 hover:bg-green-200"
                      : "bg-gray-200 text-muted-foreground hover:bg-gray-200"
                  }
                >
                  {product.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Description</div>
            <div className="mt-1 text-sm">{product.description || "—"}</div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onEdit(product)}
              className="gap-2"
              disabled={!canUpdate}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => onDelete(product)}
              className="gap-2"
              disabled={!canDelete}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
