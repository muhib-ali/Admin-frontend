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
import { useCurrency } from "@/contexts/currency-context";

type Props = {
  product: ProductRow;
  onView: (p: ProductRow) => void;
  onEdit: (p: ProductRow) => void;
  onDelete: (p: ProductRow) => void;
  renderCreatedDate: (iso: string) => string;
  svgCardImage: (seed: string) => string;
  canRead?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
};

export function ProductCard({
  product,
  onView,
  onEdit,
  onDelete,
  renderCreatedDate,
  svgCardImage,
  canRead = true,
  canUpdate = true,
  canDelete = true,
}: Props) {
  const { selectedCountry, convertAmount, getCurrencySymbol } = useCurrency();
  const [convertedPrice, setConvertedPrice] = React.useState<{ amount: number; symbol: string } | null>(null);
  
  const imgSeed = (product.description || "").trim() || product.title;
  const imageSrc = product.product_img_url || svgCardImage(imgSeed);
  const statusLabel = product.is_active ? "Active" : "Inactive";

  // Convert price when product or selected country changes
  React.useEffect(() => {
    const convertPrice = async () => {
      if (!selectedCountry) {
        setConvertedPrice({ amount: product.price, symbol: '$' });
        return;
      }

      try {
        const targetCurrency = Object.keys(selectedCountry.currencies)[0];
        const targetSymbol = Object.values(selectedCountry.currencies)[0]?.symbol || '$';
        
        if (targetCurrency === 'USD') {
          setConvertedPrice({ amount: product.price, symbol: targetSymbol });
          return;
        }

        const converted = await convertAmount(product.price, 'USD', targetCurrency);
        setConvertedPrice({ amount: converted, symbol: targetSymbol });
      } catch (error) {
        console.error('Error converting price in ProductCard:', error);
        setConvertedPrice({ amount: product.price, symbol: '$' });
      }
    };

    convertPrice();
  }, [product.price, selectedCountry, convertAmount]);

  return (
    <div className="group rounded-xl border border-gray-200 bg-white overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-all duration-300 hover:scale-[1.02]">
      <div className="relative aspect-[4/3] w-full bg-gray-100 overflow-hidden">
        <img
          src={imageSrc}
          alt={product.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = svgCardImage(imgSeed);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="absolute left-3 top-3">
          <Badge
            variant="secondary"
            className={
              statusLabel === "Active"
                ? "bg-green-200 text-green-800 hover:bg-green-200"
                : "bg-gray-200 text-muted-foreground hover:bg-gray-200"
            }
          >
            {statusLabel}
          </Badge>
        </div>

        <div className="absolute right-3 top-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-white/90 hover:shadow-md backdrop-blur-sm text-red-500 hover:text-red-600"
               >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onView(product)} disabled={!canRead}>
                <Package className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(product)} disabled={!canUpdate}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(product)}
                disabled={!canDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base text-gray-900 truncate">{product.title}</h3>
            <p className="mt-1 text-xs text-gray-500 truncate">
              {product.id} • {product.brand?.name ?? "—"}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-base font-bold text-gray-900">
              {convertedPrice ? `${convertedPrice.symbol} ${convertedPrice.amount.toFixed(2)}` : `$${product.price.toFixed(2)}`}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Stock: {product.stock_quantity}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Badge variant="outline" className="border-gray-300 text-gray-700">
            {product.category?.name ?? "—"}
          </Badge>
          <div className="text-xs text-gray-500 whitespace-nowrap">
            {renderCreatedDate(product.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
