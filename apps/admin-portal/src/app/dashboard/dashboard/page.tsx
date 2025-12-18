"use client";

import * as React from "react";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";

type LucideIcon = React.ComponentType<{ className?: string }>;

type StatsCardProps = {
  title: string;
  value: string | number;
  change: number;
  icon: LucideIcon;
  trend?: "up" | "down";
};

function StatsCard({ title, value, change, icon: Icon, trend = "up" }: StatsCardProps) {
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
                isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}
            >
              {isPositive ? "+" : ""}
              {change}%
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

const revenueData = [
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

function RevenueChart() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
        <p className="mt-1 text-sm text-gray-500">Monthly revenue and order trends</p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={revenueData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="month"
            stroke="#6B7280"
            style={{ fontSize: "12px", fontWeight: 500 }}
          />
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
          <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
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

const salesData = [
  { category: "Electronics", sales: 45000, profit: 12000 },
  { category: "Clothing", sales: 38000, profit: 15000 },
  { category: "Home & Garden", sales: 32000, profit: 9500 },
  { category: "Sports", sales: 28000, profit: 8200 },
  { category: "Books", sales: 22000, profit: 7800 },
  { category: "Toys", sales: 19000, profit: 6500 },
];

function SalesChart() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Sales by Category</h3>
        <p className="mt-1 text-sm text-gray-500">Top performing categories this month</p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={salesData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="category"
            stroke="#6B7280"
            style={{ fontSize: "12px", fontWeight: 500 }}
            angle={-15}
            textAnchor="end"
            height={80}
          />
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
          <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
          <Bar dataKey="sales" fill="#DC2626" radius={[8, 8, 0, 0]} name="Sales ($)" />
          <Bar dataKey="profit" fill="#000000" radius={[8, 8, 0, 0]} name="Profit ($)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

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

function TopProducts() {
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
              <h4 className="truncate font-semibold text-gray-900">{product.name}</h4>
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

const activityItems = [
  {
    id: 1,
    title: "New order received",
    description: "Order #12345 from John Doe",
    time: "2 minutes ago",
    icon: ShoppingCart,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
  {
    id: 2,
    title: "Product stock low",
    description: "Wireless Headphones Pro - 5 items left",
    time: "15 minutes ago",
    icon: Package,
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
  },
  {
    id: 3,
    title: "New customer registered",
    description: "Sarah Johnson joined the platform",
    time: "1 hour ago",
    icon: Users,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    id: 4,
    title: "Payment received",
    description: "$2,450 from Order #12340",
    time: "2 hours ago",
    icon: DollarSign,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
];

function RecentActivity() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <p className="mt-1 text-sm text-gray-500">Latest updates and notifications</p>
      </div>
      <div className="space-y-4">
        {activityItems.map((activity) => (
          <div
            key={activity.id}
            className="group flex items-start gap-4 rounded-lg border border-gray-100 p-4 transition-all hover:border-gray-200 hover:bg-gray-50"
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                activity.iconBg
              )}
            >
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

const quickActions = [
  {
    id: 1,
    title: "New Order",
    description: "Create a new order",
    icon: ShoppingCart,
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
    icon: TrendingUp,
    variant: "secondary" as const,
  },
];

function QuickActions() {
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
            className="h-auto min-h-24 flex-col items-start gap-2 p-4 text-left whitespace-normal"
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

type OrderStatusKey = "Confirmed" | "Processing" | "Pending" | "Cancelled";

const statusPillClass: Record<OrderStatusKey, string> = {
  Confirmed: "bg-emerald-500/10 text-emerald-700",
  Processing: "bg-sky-500/10 text-sky-700",
  Pending: "bg-amber-500/10 text-amber-700",
  Cancelled: "bg-red-500/10 text-red-700",
};

const orderStatusTrendData = [
  { day: "Mon", Confirmed: 38, Processing: 20, Pending: 14, Cancelled: 4 },
  { day: "Tue", Confirmed: 42, Processing: 22, Pending: 12, Cancelled: 5 },
  { day: "Wed", Confirmed: 45, Processing: 18, Pending: 16, Cancelled: 3 },
  { day: "Thu", Confirmed: 52, Processing: 24, Pending: 10, Cancelled: 6 },
  { day: "Fri", Confirmed: 58, Processing: 26, Pending: 12, Cancelled: 4 },
  { day: "Sat", Confirmed: 61, Processing: 20, Pending: 18, Cancelled: 7 },
  { day: "Sun", Confirmed: 55, Processing: 19, Pending: 15, Cancelled: 5 },
];

function OrderStatusTrends() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Order Status Trends</h3>
        <p className="mt-1 text-sm text-gray-500">Last 7 days breakdown</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(Object.keys(statusPillClass) as OrderStatusKey[]).map((k) => (
          <Badge key={k} variant="secondary" className={statusPillClass[k]}>
            {k}
          </Badge>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={orderStatusTrendData} margin={{ left: 0, right: 10 }}>
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

export default function DashboardComponent() {
  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Welcome back! Here&apos;s what&apos;s happening with your store today.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <span className="text-sm font-semibold text-green-700">Sales up 23% this month</span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Revenue" value="$98,450" change={23.5} icon={DollarSign} trend="up" />
        <StatsCard title="Total Orders" value="1,245" change={12.3} icon={ShoppingCart} trend="up" />
        <StatsCard title="Total Customers" value="8,542" change={8.7} icon={Users} trend="up" />
        <StatsCard title="Total Products" value="456" change={5.2} icon={Package} trend="up" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart />
        <SalesChart />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TopProducts />
        </div>
        <QuickActions />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OrderStatusTrends />
        <RecentActivity />
      </div>

      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-red-600 to-red-700 p-8 text-white shadow-[0_8px_24px_rgba(220,38,38,0.3)]">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-2xl font-bold">Ready to boost your sales?</h3>
            <p className="mt-2 text-red-100">Explore our premium features to take your business to the next level.</p>
            <button className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-red-600 shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl active:scale-95">
              Get Started
              <ArrowUpRight className="h-5 w-5" />
            </button>
          </div>
          <div className="hidden lg:block">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
              <TrendingUp className="h-16 w-16 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
