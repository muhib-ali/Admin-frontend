"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";

export type Brand = {
  id: string;
  name: string;
};

export const BRANDS: Brand[] = [
  { id: "nova", name: "Nova" },
  { id: "acme", name: "Acme" },
  { id: "evergreen", name: "Evergreen" },
  { id: "zenith", name: "Zenith" },
  { id: "pulse", name: "Pulse" },
  { id: "vertex", name: "Vertex" },
];

type Props = {
  brands?: Brand[];
  onBrandClick?: (brandId: string) => void;
  selectedBrand?: string | "all";
};

export function BrandList({
  brands = BRANDS,
  onBrandClick,
  selectedBrand = "all",
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {brands.map((brand) => (
        <Badge
          key={brand.id}
          variant={selectedBrand === brand.id ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => onBrandClick?.(brand.id)}
        >
          {brand.name}
        </Badge>
      ))}
    </div>
  );
}
