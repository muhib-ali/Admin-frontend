import {
  BarChart2,
  Users,
  Package,
  CreditCard,
  ShieldCheck,
  Shield,
  Box,
  Truck,
  Layers,
} from "lucide-react";

export const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart2 },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/orders", label: "Orders", icon: Truck },
  { href: "/dashboard/bulk-orders", label: "Bulk Orders", icon: Layers },
  { href: "/dashboard/projects", label: "Projects", icon: Package },
  { href: "/dashboard/subscriptions", label: "Subscriptions", icon: CreditCard },
];

export const ADMIN_NAV_LINKS = [
  { href: "/dashboard/modules", label: "Modules", icon: Box },
  { href: "/dashboard/permissions", label: "Permissions", icon: ShieldCheck },
  { href: "/dashboard/roles", label: "Roles", icon: Shield },
  { href: "/dashboard/users", label: "Users", icon: Users },
];
