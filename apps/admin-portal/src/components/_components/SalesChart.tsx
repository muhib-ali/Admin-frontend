"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { category: "Electronics", sales: 45000, profit: 12000 },
  { category: "Clothing", sales: 38000, profit: 15000 },
  { category: "Home & Garden", sales: 32000, profit: 9500 },
  { category: "Sports", sales: 28000, profit: 8200 },
  { category: "Books", sales: 22000, profit: 7800 },
  { category: "Toys", sales: 19000, profit: 6500 },
];

export function SalesChart() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Sales by Category</h3>
        <p className="mt-1 text-sm text-gray-500">Top performing categories this month</p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="category" 
            stroke="#6B7280"
            style={{ fontSize: "12px", fontWeight: 500 }}
            angle={-15}
            textAnchor="end"
            height={80}
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
          <Bar 
            dataKey="sales" 
            fill="#DC2626" 
            radius={[8, 8, 0, 0]}
            name="Sales ($)"
          />
          <Bar 
            dataKey="profit" 
            fill="#000000" 
            radius={[8, 8, 0, 0]}
            name="Profit ($)"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
