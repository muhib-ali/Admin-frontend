"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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

function ImageCarousel({
  images,
  productName,
  productDescription,
  svgCardImage,
}: {
  images: string[];
  productName: string;
  productDescription?: string;
  svgCardImage: (seed: string) => string;
}) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const displayImages = images.slice(0, 5);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="grid gap-2">
      <div className="text-sm font-medium">Images</div>
      <div className="relative">
        <div className="overflow-hidden rounded-lg border bg-muted aspect-[16/9]">
          <img
            src={displayImages[currentIndex]}
            alt={`${productName} ${currentIndex + 1}`}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = svgCardImage(
                (productDescription || "").trim() || productName
              );
            }}
          />
        </div>

        {displayImages.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md bg-white/90 hover:bg-white shadow-md flex items-center justify-center transition-all hover:scale-110"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5 text-gray-700" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md bg-white/90 hover:bg-white shadow-md flex items-center justify-center transition-all hover:scale-110"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5 text-gray-700" />
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {displayImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? "w-6 bg-white"
                      : "w-2 bg-white/60 hover:bg-white/80"
                  }`}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
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

          <ImageCarousel
            images={product.images?.length ? product.images : [product.image]}
            productName={product.name}
            productDescription={product.description}
            svgCardImage={svgCardImage}
          />

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
