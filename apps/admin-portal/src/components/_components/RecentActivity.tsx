"use client";

import { ShoppingCart, Package, Users, DollarSign, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/utils/cn";

const activities = [
  {
    id: 1,
    type: "order",
    title: "New order received",
    description: "Order #12345 from John Doe",
    time: "2 minutes ago",
    icon: ShoppingCart,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
  {
    id: 2,
    type: "product",
    title: "Product stock low",
    description: "Wireless Headphones Pro - 5 items left",
    time: "15 minutes ago",
    icon: AlertCircle,
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
  },
  {
    id: 3,
    type: "user",
    title: "New customer registered",
    description: "Sarah Johnson joined the platform",
    time: "1 hour ago",
    icon: Users,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    id: 4,
    type: "payment",
    title: "Payment received",
    description: "$2,450 from Order #12340",
    time: "2 hours ago",
    icon: DollarSign,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    id: 5,
    type: "shipment",
    title: "Order shipped",
    description: "Order #12338 dispatched to customer",
    time: "3 hours ago",
    icon: Package,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    id: 6,
    type: "completed",
    title: "Order completed",
    description: "Order #12335 delivered successfully",
    time: "5 hours ago",
    icon: CheckCircle,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
];

export function RecentActivity() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <p className="mt-1 text-sm text-gray-500">Latest updates and notifications</p>
      </div>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="group flex items-start gap-4 rounded-lg border border-gray-100 p-4 transition-all hover:border-gray-200 hover:bg-gray-50"
          >
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", activity.iconBg)}>
              <activity.icon className={cn("h-5 w-5", activity.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900">{activity.title}</h4>
              <p className="mt-1 text-sm text-gray-600">{activity.description}</p>
              <p className="mt-2 text-xs text-gray-500">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
