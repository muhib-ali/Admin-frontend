"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { month: "Jan", revenue: 45000, orders: 320 },
  { month: "Feb", revenue: 52000, orders: 380 },
  { month: "Mar", revenue: 48000, orders: 350 },
  { month: "Apr", revenue: 61000, orders: 420 },
  { month: "May", revenue: 55000, orders: 390 },
  { month: "Jun", revenue: 67000, orders: 480 },
  { month: "Jul", revenue: 72000, orders: 510 },
  { month: "Aug", revenue: 68000, orders: 490 },
  { month: "Sep", revenue: 79000, orders: 560 },
  { month: "Oct", revenue: 85000, orders: 610 },
  { month: "Nov", revenue: 92000, orders: 650 },
  { month: "Dec", revenue: 98000, orders: 720 },
];

export function RevenueChart() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
        <p className="mt-1 text-sm text-gray-500">Monthly revenue and order trends</p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="month" 
            stroke="#6B7280"
            style={{ fontSize: "12px", fontWeight: 500 }}
          />
          <YAxis 
            stroke="#6B7280"
            style={{ fontSize: "12px", fontWeight: 500 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
            labelStyle={{ fontWeight: 600, color: "#111827" }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="circle"
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#DC2626"
            strokeWidth={3}
            dot={{ fill: "#DC2626", r: 4 }}
            activeDot={{ r: 6 }}
            name="Revenue ($)"
          />
          <Line
            type="monotone"
            dataKey="orders"
            stroke="#000000"
            strokeWidth={3}
            dot={{ fill: "#000000", r: 4 }}
            activeDot={{ r: 6 }}
            name="Orders"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
