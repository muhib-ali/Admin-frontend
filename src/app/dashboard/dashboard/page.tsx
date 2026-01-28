"use client";

import * as React from "react";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  ArrowUpRight,
  Loader2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { getDashboardOverview, type DashboardOverview } from "@/services/dashboard";
import { QuickActions } from "@/components/_components/QuickActions";
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

function RevenueChart({
  data,
}: {
  data: Array<{ day: string; revenue: number; orders: number }>;
}) {
  const hasAnyData = data.some((d) => (d?.revenue ?? 0) > 0 || (d?.orders ?? 0) > 0);
  const chartData = data.map((item) => ({
    day: new Date(item.day).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    revenue: item.revenue,
    orders: item.orders,
  }));
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
        <p className="mt-1 text-sm text-gray-500">Daily revenue and order trends</p>
      </div>
      {!hasAnyData ? (
        <div className="flex h-[350px] items-center justify-center text-sm text-gray-500">
          No revenue/orders data for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="day"
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
      )}
    </div>
  );
}

function SalesChart({
  data,
}: {
  data: Array<{ categoryName: string; revenue: number; quantity: number }>;
}) {
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
            dataKey="categoryName"
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
          <Bar dataKey="revenue" fill="#DC2626" radius={[8, 8, 0, 0]} name="Revenue" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopProducts({
  data,
}: {
  data: Array<{ productName: string; quantity: number; revenue: number }>;
}) {
  const topProducts = data.slice(0, 5).map((item, idx) => ({
    id: idx + 1,
    name: item.productName,
    sales: item.quantity,
    revenue: `$${item.revenue.toLocaleString()}`,
  }));
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
                <span className="text-xs text-gray-500">{product.sales} sales</span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900">{product.revenue}</p>
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

type OrderStatusKey = "Confirmed" | "Pending" | "Cancelled";

const statusPillClass: Record<OrderStatusKey, string> = {
  Confirmed: "bg-emerald-500/10 text-emerald-700",
  Pending: "bg-amber-500/10 text-amber-700",
  Cancelled: "bg-red-500/10 text-red-700",
};

function OrderStatusTrends({
  data,
}: {
  data: Array<{ day: string; pending: number; accepted: number; rejected: number }>;
}) {
  const hasAnyData = data.some(
    (d) => (d?.pending ?? 0) > 0 || (d?.accepted ?? 0) > 0 || (d?.rejected ?? 0) > 0
  );
  const chartData = data.map((item) => ({
    day: new Date(item.day).toLocaleDateString("en-US", { weekday: "short" }),
    Confirmed: item.accepted,
    Pending: item.pending,
    Cancelled: item.rejected,
  }));
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

      {!hasAnyData ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-gray-500">
          No order status activity for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ left: 0, right: 10 }}>
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
          <Area type="monotone" dataKey="Pending" stackId="1" stroke="#D97706" fill="#D97706" fillOpacity={0.15} />
          <Area type="monotone" dataKey="Cancelled" stackId="1" stroke="#DC2626" fill="#DC2626" fillOpacity={0.12} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function DashboardComponent() {
  const [loading, setLoading] = React.useState(true);
  const [dashboardData, setDashboardData] = React.useState<DashboardOverview | null>(null);

  React.useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const data = await getDashboardOverview();
        setDashboardData(data);
      } catch (error: any) {
        console.error("Failed to load dashboard:", error);
        toast.error(error?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No dashboard data available</p>
      </div>
    );
  }

  const { cards, charts } = dashboardData;

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
          <span className="text-sm font-semibold text-green-700">
            Sales {cards.salesUpPercent >= 0 ? 'up' : 'down'} {Math.abs(cards.salesUpPercent)}% this month
          </span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Total Revenue" 
          value={`$${cards.revenue.current.toLocaleString()}`} 
          change={cards.revenue.deltaPercent} 
          icon={DollarSign} 
          trend="up" 
        />
        <StatsCard 
          title="Total Orders" 
          value={cards.orders.current.toLocaleString()} 
          change={cards.orders.deltaPercent} 
          icon={ShoppingCart} 
          trend="up" 
        />
        <StatsCard 
          title="New Customers" 
          value={cards.newCustomers.current.toLocaleString()} 
          change={cards.newCustomers.deltaPercent} 
          icon={Users} 
          trend="up" 
        />
        <StatsCard 
          title="New Products" 
          value={cards.newProducts.current.toLocaleString()} 
          change={cards.newProducts.deltaPercent} 
          icon={Package} 
          trend="up" 
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart data={charts.revenueOverview} />
        <SalesChart data={charts.salesByCategory} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TopProducts data={charts.topProducts} />
        </div>
        <QuickActions />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OrderStatusTrends data={charts.orderStatusTrends} />
        <RecentActivity />
      </div>

      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-red-600 via-red-700 to-black p-8 text-white shadow-[0_8px_24px_rgba(220,38,38,0.3)]">
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
