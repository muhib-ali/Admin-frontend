"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";

type CategoryKey = "electronics" | "home" | "fashion" | "sports" | "beauty" | "books";

export type Category = {
  key: CategoryKey;
  label: string;
};

export const CATEGORIES: Category[] = [
  { key: "electronics", label: "Electronics" },
  { key: "home", label: "Home & Kitchen" },
  { key: "fashion", label: "Fashion" },
  { key: "sports", label: "Sports" },
  { key: "beauty", label: "Beauty" },
  { key: "books", label: "Books" },
];

type Props = {
  categories?: Category[];
  onCategoryClick?: (category: CategoryKey) => void;
  selectedCategory?: CategoryKey | "all";
};

export function CategoryList({
  categories = CATEGORIES,
  onCategoryClick,
  selectedCategory = "all",
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <Badge
          key={category.key}
          variant={selectedCategory === category.key ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => onCategoryClick?.(category.key)}
        >
          {category.label}
        </Badge>
      ))}
    </div>
  );
}
