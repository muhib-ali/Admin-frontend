"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

interface StatsCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: LucideIcon;
  trend?: "up" | "down";
}

export function StatsCard({ title, value, change, icon: Icon, trend = "up" }: StatsCardProps) {
  const isPositive = trend === "up" ? change >= 0 : change <= 0;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] hover:scale-[1.02]">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <h3 className="mt-2 text-3xl font-bold text-gray-900">{value}</h3>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold",
                isPositive
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              )}
            >
              {isPositive ? "+" : ""}{change}%
            </span>
            <span className="text-xs text-gray-500">vs last month</span>
          </div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 transition-colors group-hover:bg-red-100">
          <Icon className="h-6 w-6 text-red-600" />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-red-600 to-red-400 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
