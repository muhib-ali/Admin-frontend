"use client";

import { Package, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const topProducts = [
  {
    id: 1,
    name: "Wireless Headphones Pro",
    category: "Electronics",
    sales: 1250,
    revenue: "$62,500",
    trend: 12.5,
  },
  {
    id: 2,
    name: "Smart Watch Series 5",
    category: "Electronics",
    sales: 980,
    revenue: "$49,000",
    trend: 8.3,
  },
  {
    id: 3,
    name: "Premium Yoga Mat",
    category: "Sports",
    sales: 850,
    revenue: "$25,500",
    trend: 15.2,
  },
  {
    id: 4,
    name: "Designer Backpack",
    category: "Clothing",
    sales: 720,
    revenue: "$43,200",
    trend: 6.7,
  },
  {
    id: 5,
    name: "Coffee Maker Deluxe",
    category: "Home & Garden",
    sales: 650,
    revenue: "$32,500",
    trend: 10.1,
  },
];

export function TopProducts() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
          <p className="mt-1 text-sm text-gray-500">Best selling items this month</p>
        </div>
        <Package className="h-6 w-6 text-red-600" />
      </div>
      <div className="space-y-4">
        {topProducts.map((product, index) => (
          <div
            key={product.id}
            className="group flex items-center gap-4 rounded-lg border border-gray-100 p-4 transition-all hover:border-red-200 hover:bg-red-50/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 font-bold text-gray-600 transition-colors group-hover:bg-red-100 group-hover:text-red-600">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{product.name}</h4>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {product.category}
                </Badge>
                <span className="text-xs text-gray-500">{product.sales} sales</span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900">{product.revenue}</p>
              <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                <TrendingUp className="h-3 w-3" />
                <span>+{product.trend}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
