"use client";

import { ResponsiveContainer, Tooltip, CartesianGrid, XAxis, YAxis, Legend, AreaChart, Area } from "recharts";
import { Badge } from "@/components/ui/badge";

type OrderStatusKey = "Confirmed" | "Processing" | "Pending" | "Cancelled";

const statusPillClass: Record<OrderStatusKey, string> = {
  Confirmed: "bg-emerald-500/10 text-emerald-700",
  Processing: "bg-sky-500/10 text-sky-700",
  Pending: "bg-amber-500/10 text-amber-700",
  Cancelled: "bg-red-500/10 text-red-700",
};

const data = [
  { day: "Mon", Confirmed: 38, Processing: 20, Pending: 14, Cancelled: 4 },
  { day: "Tue", Confirmed: 42, Processing: 22, Pending: 12, Cancelled: 5 },
  { day: "Wed", Confirmed: 45, Processing: 18, Pending: 16, Cancelled: 3 },
  { day: "Thu", Confirmed: 52, Processing: 24, Pending: 10, Cancelled: 6 },
  { day: "Fri", Confirmed: 58, Processing: 26, Pending: 12, Cancelled: 4 },
  { day: "Sat", Confirmed: 61, Processing: 20, Pending: 18, Cancelled: 7 },
  { day: "Sun", Confirmed: 55, Processing: 19, Pending: 15, Cancelled: 5 },
];

export function PerformanceMetrics() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Order Status Trends</h3>
        <p className="mt-1 text-sm text-gray-500">Last 7 days breakdown</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(Object.keys(statusPillClass) as OrderStatusKey[]).map((k) => (
          <Badge key={k} variant="secondary" className={statusPillClass[k]}>
            {k}
          </Badge>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ left: 0, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="day" stroke="#6B7280" style={{ fontSize: "12px", fontWeight: 500 }} />
          <YAxis stroke="#6B7280" style={{ fontSize: "12px", fontWeight: 500 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
            labelStyle={{ fontWeight: 600, color: "#111827" }}
          />
          <Legend wrapperStyle={{ paddingTop: "12px" }} iconType="circle" />

          <Area type="monotone" dataKey="Confirmed" stackId="1" stroke="#059669" fill="#059669" fillOpacity={0.15} />
          <Area type="monotone" dataKey="Processing" stackId="1" stroke="#0284C7" fill="#0284C7" fillOpacity={0.15} />
          <Area type="monotone" dataKey="Pending" stackId="1" stroke="#D97706" fill="#D97706" fillOpacity={0.15} />
          <Area type="monotone" dataKey="Cancelled" stackId="1" stroke="#DC2626" fill="#DC2626" fillOpacity={0.12} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
