"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Package, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProductRow } from "./product-form";

type Props = {
  product: ProductRow;
  onView: (p: ProductRow) => void;
  onEdit: (p: ProductRow) => void;
  onDelete: (p: ProductRow) => void;
  renderCreatedDate: (iso: string) => string;
  svgCardImage: (seed: string) => string;
};

export function ProductCard({
  product,
  onView,
  onEdit,
  onDelete,
  renderCreatedDate,
  svgCardImage,
}: Props) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="relative aspect-[4/3] w-full bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = svgCardImage(
              (product.description || "").trim() || product.name
            );
          }}
        />
        <div className="absolute left-3 top-3">
          <Badge variant={product.status === "Active" ? "default" : "secondary"}>
            {product.status}
          </Badge>
        </div>

        <div className="absolute right-3 top-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-background/80 hover:bg-background"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(product)}>
                <Package className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(product)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(product)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold truncate">{product.name}</div>
            <div className="mt-1 text-xs text-muted-foreground truncate">
              {product.id} • {product.brand}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">${product.price.toFixed(2)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Stock: {product.stock}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <Badge variant="outline">{product.category.label}</Badge>
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {renderCreatedDate(product.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
}
