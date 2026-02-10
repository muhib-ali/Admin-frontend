"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, FileText, Users } from "lucide-react";

const quickActions = [
  {
    id: 1,
    title: "See Orders",
    description: "see new orders",
    icon: ShoppingCart,
    variant: "default" as const,
    href: "/dashboard/orders",
  },
  {
    id: 2,
    title: "Add Product",
    description: "Create new product",
    icon: Package,
    variant: "secondary" as const,
    href: "/dashboard/products/new",
  },
  {
    id: 3,
    title: "Add Blog",
    description: "Add new blog",
    icon: FileText,
    variant: "secondary" as const,
    href: "/dashboard/blogs",
  },
  {
    id: 4,
    title: "Add a user",
    description: "Add new user",
    icon: Users,
    variant: "secondary" as const,
    href: "/dashboard/users",
  },
];

export function QuickActions() {
  const router = useRouter();

  const handleActionClick = (href: string) => {
    router.push(href);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <p className="mt-1 text-sm text-gray-500">Frequently used actions</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {quickActions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant}
            className="h-auto min-h-24 flex-col items-start gap-2 p-4 text-left whitespace-normal hover:scale-105 transition-transform"
            onClick={() => handleActionClick(action.href)}
          >
            <action.icon className="h-5 w-5" />
            <div className="min-w-0">
              <div className="font-semibold leading-tight truncate">{action.title}</div>
              <div className="text-xs opacity-80 leading-snug break-words">
                {action.description}
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
