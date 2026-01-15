"use client";

import { Plus, FileText, Users, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  {
    id: 1,
    title: "New Order",
    description: "Create a new order",
    icon: Plus,
    variant: "default" as const,
  },
  {
    id: 2,
    title: "Add Product",
    description: "Add new product",
    icon: Package,
    variant: "secondary" as const,
  },
  {
    id: 3,
    title: "New Customer",
    description: "Register customer",
    icon: Users,
    variant: "secondary" as const,
  },
  {
    id: 4,
    title: "View Reports",
    description: "Analytics & reports",
    icon: FileText,
    variant: "secondary" as const,
  },
];

export function QuickActions() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <p className="mt-1 text-sm text-gray-500">Frequently used actions</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant}
            className="h-auto flex-col items-start gap-2 p-4 text-left"
          >
            <action.icon className="h-5 w-5" />
            <div>
              <div className="font-semibold">{action.title}</div>
              <div className="text-xs opacity-80">{action.description}</div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
