"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import {
  BarChart2,
  ChevronDown,
  ChevronRight,
  FolderTree,
  ShoppingCart,
  Store,
  Tags,
  FileText,
  Receipt,
  Users,
  Package,
  Tag,
  BadgePercent,
  Boxes,
  Box,
  TicketPercent,
  ShieldCheck,
  Shield,
  LogOut,
  Coins,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import PermissionGate from "@/components/permission-gate";
import { ADMIN_LINK_PERM } from "@/rbac/link-permissions";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { useHasPermission } from "@/hooks/use-permission";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const ICONS = {
  BarChart2,
  FileText,
  Receipt,
  Users,
  Package,
  Tag,
  BadgePercent,
  Coins,
  Boxes,
  Box,
  TicketPercent,
  ShieldCheck,
  Shield,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} as const;

type IconName = keyof typeof ICONS;

export const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "BarChart2" as IconName },
  { href: "/dashboard/invoices", label: "Invoices", icon: "FileText" as IconName },
  { href: "/dashboard/quotations", label: "Quotations", icon: "Receipt" as IconName },
  { href: "/dashboard/clients", label: "Clients", icon: "Users" as IconName },
  { href: "/dashboard/customers", label: "Customers", icon: "Users" as IconName },
  { href: "/dashboard/products", label: "Products", icon: "Package" as IconName },
  { href: "/dashboard/warehouses", label: "Warehouses", icon: "Box" as IconName },
  { href: "/dashboard/promo-codes", label: "Promo Codes", icon: "TicketPercent" as IconName },
  { href: "/dashboard/blogs", label: "Blogs", icon: "FileText" as IconName },
];

export const nav_admin = [
  { href: "/dashboard/jobFiles", label: "Job files", icon: "Tag" as IconName },
  { href: "/dashboard/tax", label: "Taxes", icon: "BadgePercent" as IconName },
  { href: "/dashboard/suppliers", label: "Suppliers", icon: "Users" as IconName },
  { href: "/dashboard/modules", label: "Modules", icon: "Boxes" as IconName },
  { href: "/dashboard/permissions", label: "Permissions", icon: "ShieldCheck" as IconName },
  { href: "/dashboard/roles", label: "Roles", icon: "Shield" as IconName },
  { href: "/dashboard/users", label: "Users", icon: "Users" as IconName },
];

function IconByName({ name, className }: { name: IconName; className?: string }) {
  if (name === "BadgePercent" && !ICONS.BadgePercent) {
    const Fallback = ICONS.Coins ?? ICONS.FileText;
    return <Fallback className={className} />;
  }
  if (name === "Boxes" && !ICONS.Boxes) {
    const Fallback = ICONS.Box ?? ICONS.Package ?? ICONS.FileText;
    return <Fallback className={className} />;
  }
  const I = ICONS[name] ?? ICONS.FileText;
  return <I className={className} />;
}

type Props = { 
  collapsed?: boolean; 
  onToggle?: () => void;
};

export default function Sidebar({ collapsed = false, onToggle }: Props) {
  const pathname = usePathname();
  const { hasUnsavedChanges } = useUnsavedChanges();
  const { data: session } = useSession();

  const productMgmtPerms = React.useMemo(
    () => ({
      categories: ADMIN_LINK_PERM["/dashboard/categories"],
      brands: ADMIN_LINK_PERM["/dashboard/brands"],
      products: ADMIN_LINK_PERM["/dashboard/products"],
    }),
    []
  );

  const orderMgmtPerms = React.useMemo(
    () => ({
      orders: ADMIN_LINK_PERM["/dashboard/orders"],
      bulkOrders: ADMIN_LINK_PERM["/dashboard/bulk-orders"],
      reviews: ADMIN_LINK_PERM["/dashboard/reviews"],
    }),
    []
  );

  const canSeeCategories = useHasPermission(productMgmtPerms.categories);
  const canSeeBrands = useHasPermission(productMgmtPerms.brands);
  const canSeeProducts = useHasPermission(productMgmtPerms.products);
  const canSeeProductMgmt =
    canSeeCategories || canSeeBrands || canSeeProducts;

  const canSeeOrders = useHasPermission(orderMgmtPerms.orders);
  const canSeeBulkOrders = useHasPermission(orderMgmtPerms.bulkOrders);
  const canSeeReviews = useHasPermission(orderMgmtPerms.reviews);
  const canSeeOrderMgmt =
    canSeeOrders || canSeeBulkOrders || canSeeReviews;

  const [orderMgmtOpen, setOrderMgmtOpen] = React.useState(false);
  const [productMgmtOpen, setProductMgmtOpen] = React.useState(false);

  const dashboardItem = React.useMemo(
    () => nav.find((i) => i.href === "/dashboard"),
    []
  );
  const navRest = React.useMemo(
    () =>
      nav.filter(
        (i) => i.href !== "/dashboard" && i.href !== "/dashboard/products"
      ),
    []
  );

  const orderMgmtLinks = React.useMemo(
    () =>
      [
        { href: "/dashboard/orders", label: "Orders" },
        { href: "/dashboard/bulk-orders", label: "Bulk Orders" },
        { href: "/dashboard/reviews", label: "Reviews" },
      ] as const,
    []
  );

  React.useEffect(() => {
    if (!pathname) return;
    if (
      pathname.startsWith("/dashboard/orders") ||
      pathname.startsWith("/dashboard/bulk-orders") ||
      pathname.startsWith("/dashboard/reviews")
    ) {
      setOrderMgmtOpen(true);
    }

    if (
      pathname.startsWith("/dashboard/categories") ||
      pathname.startsWith("/dashboard/brands") ||
      pathname.startsWith("/dashboard/products")
    ) {
      setProductMgmtOpen(true);
    }
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await signOut({ redirectTo: "/login" });
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      const shouldLeave = window.confirm(
        "You have unsaved changes, do you really want to leave?"
      );
      if (shouldLeave) {
        window.location.href = href;
      }
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex h-full min-h-0 flex-col max-w-full overflow-hidden bg-black",
          collapsed ? "w-20" : "w-72"
        )}
      >
      <div className={cn("px-5 py-6", collapsed && "px-3")}>
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <div className={cn("text-2xl font-bold text-white tracking-tight", collapsed && "text-lg")}>
            {!collapsed ? "Admin Dashboard" : "AD"}
          </div>
          {onToggle && (
            <button
              onClick={onToggle}
              className={cn(
                "ml-auto text-white/60 hover:text-white transition-colors",
                collapsed && "mx-auto"
              )}
              aria-label="Toggle sidebar"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? ">" : "<"}
            </button>
          )}
        </div>
      </div>

      <nav
        className={cn(
          "px-2 pb-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        <ul
          className={cn(
            "space-y-1 overflow-x-hidden",
            collapsed ? "w-full" : "w-[103%]"
          )}
        >
          <li
            className={cn(
              "text-xs font-semibold uppercase tracking-wider px-4 text-gray-500 py-2",
              collapsed && "mx-2 text-center px-2"
            )}
          >
            {!collapsed ? "Navigation" : "Nav"}
          </li>

          {dashboardItem && (() => {
            const { href, label, icon } = dashboardItem;
            const active = pathname === "/dashboard" || pathname === "/dashboard/dashboard";
            const perm = ADMIN_LINK_PERM[href];

            const dashboardLink = (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    onClick={(e) => handleNavigation(e, href)}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                      active 
                        ? "bg-zinc-900 text-white before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-red-600 before:rounded-r" 
                        : "text-gray-400 hover:bg-zinc-900 hover:text-white",
                      collapsed && "justify-center"
                    )}
                  >
                    <IconByName name={icon} className={cn("h-5 w-5 shrink-0 transition-colors", active ? "text-red-600" : "text-gray-400 group-hover:text-red-600")} />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    <p>{label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );

            if (perm) {
              return (
                <li key={href}>
                  <PermissionGate route={perm} fallback={null}>
                    {dashboardLink}
                  </PermissionGate>
                </li>
              );
            }
            return <li key={href}>{dashboardLink}</li>;
          })()}

          {!collapsed && canSeeOrderMgmt && (
            <li>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setOrderMgmtOpen((v) => !v)}
                  className={cn(
                    "group relative flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                    (pathname?.startsWith("/dashboard/orders") ||
                      pathname?.startsWith("/dashboard/bulk-orders") ||
                      pathname?.startsWith("/dashboard/reviews"))
                      ? "bg-zinc-900 text-white before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-red-600 before:rounded-r"
                      : "text-gray-400 hover:bg-zinc-900 hover:text-white"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <ShoppingCart className={cn("h-5 w-5 shrink-0 transition-colors", (pathname?.startsWith("/dashboard/orders") || pathname?.startsWith("/dashboard/bulk-orders") || pathname?.startsWith("/dashboard/reviews")) ? "text-red-600" : "text-gray-400 group-hover:text-red-600")} />
                    <span className="truncate">Order Management</span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform",
                      orderMgmtOpen && "rotate-180"
                    )}
                  />
                </button>

                {orderMgmtOpen && (
                  <div className="mt-1 space-y-1 pl-6">
                    {canSeeOrders && (
                      <PermissionGate route={orderMgmtPerms.orders} fallback={null}>
                        <Link
                          href="/dashboard/orders"
                          onClick={(e) => handleNavigation(e, "/dashboard/orders")}
                          className={cn(
                            "group flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                            pathname?.startsWith("/dashboard/orders")
                              ? "bg-zinc-900 text-white"
                              : "text-gray-500 hover:bg-zinc-900 hover:text-white"
                          )}
                        >
                          <ChevronRight className={cn("h-4 w-4 shrink-0 transition-colors", pathname?.startsWith("/dashboard/orders") ? "text-red-600" : "text-gray-500 group-hover:text-red-600")} />
                          <span className="truncate">Orders</span>
                        </Link>
                      </PermissionGate>
                    )}

                    {canSeeBulkOrders && (
                      <PermissionGate route={orderMgmtPerms.bulkOrders} fallback={null}>
                        <Link
                          href="/dashboard/bulk-orders"
                          onClick={(e) => handleNavigation(e, "/dashboard/bulk-orders")}
                          className={cn(
                            "group flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                            pathname?.startsWith("/dashboard/bulk-orders")
                              ? "bg-zinc-900 text-white"
                              : "text-gray-500 hover:bg-zinc-900 hover:text-white"
                          )}
                        >
                          <ChevronRight className={cn("h-4 w-4 shrink-0 transition-colors", pathname?.startsWith("/dashboard/bulk-orders") ? "text-red-600" : "text-gray-500 group-hover:text-red-600")} />
                          <span className="truncate">Bulk Orders</span>
                        </Link>
                      </PermissionGate>
                    )}

                    {canSeeReviews && (
                      <PermissionGate route={orderMgmtPerms.reviews} fallback={null}>
                        <Link
                          href="/dashboard/reviews"
                          onClick={(e) => handleNavigation(e, "/dashboard/reviews")}
                          className={cn(
                            "group flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                            pathname?.startsWith("/dashboard/reviews")
                              ? "bg-zinc-900 text-white"
                              : "text-gray-500 hover:bg-zinc-900 hover:text-white"
                          )}
                        >
                          <ChevronRight className={cn("h-4 w-4 shrink-0 transition-colors", pathname?.startsWith("/dashboard/reviews") ? "text-red-600" : "text-gray-500 group-hover:text-red-600")} />
                          <span className="truncate">Reviews</span>
                        </Link>
                      </PermissionGate>
                    )}
                  </div>
                )}
              </div>
            </li>
          )}

          {!collapsed && canSeeProductMgmt && (
            <li>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setProductMgmtOpen((v) => !v)}
                  className={cn(
                    "group relative flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                    (pathname?.startsWith("/dashboard/categories") ||
                      pathname?.startsWith("/dashboard/brands") ||
                      pathname?.startsWith("/dashboard/products"))
                      ? "bg-zinc-900 text-white before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-red-600 before:rounded-r"
                      : "text-gray-400 hover:bg-zinc-900 hover:text-white"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Store
                      className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        pathname?.startsWith("/dashboard/categories") ||
                          pathname?.startsWith("/dashboard/brands") ||
                          pathname?.startsWith("/dashboard/products")
                          ? "text-red-600"
                          : "text-gray-400 group-hover:text-red-600"
                      )}
                    />
                    <span className="truncate">Product Management</span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform",
                      productMgmtOpen && "rotate-180"
                    )}
                  />
                </button>

                {productMgmtOpen && (
                  <div className="mt-1 space-y-1 pl-6">
                    <PermissionGate route={productMgmtPerms.categories} fallback={null}>
                      <Link
                        href="/dashboard/categories"
                        onClick={(e) => handleNavigation(e, "/dashboard/categories")}
                        className={cn(
                          "group flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                          pathname?.startsWith("/dashboard/categories")
                            ? "bg-zinc-900 text-white"
                            : "text-gray-500 hover:bg-zinc-900 hover:text-white"
                        )}
                      >
                        <FolderTree
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            pathname?.startsWith("/dashboard/categories")
                              ? "text-red-600"
                              : "text-gray-500 group-hover:text-red-600"
                          )}
                        />
                        <span className="truncate">Categories</span>
                      </Link>
                    </PermissionGate>

                    <PermissionGate route={productMgmtPerms.brands} fallback={null}>
                      <Link
                        href="/dashboard/brands"
                        onClick={(e) => handleNavigation(e, "/dashboard/brands")}
                        className={cn(
                          "group flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                          pathname?.startsWith("/dashboard/brands")
                            ? "bg-zinc-900 text-white"
                            : "text-gray-500 hover:bg-zinc-900 hover:text-white"
                        )}
                      >
                        <Tags
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            pathname?.startsWith("/dashboard/brands")
                              ? "text-red-600"
                              : "text-gray-500 group-hover:text-red-600"
                          )}
                        />
                        <span className="truncate">Brands</span>
                      </Link>
                    </PermissionGate>

                    <PermissionGate route={productMgmtPerms.products} fallback={null}>
                      <Link
                        href="/dashboard/products"
                        onClick={(e) => handleNavigation(e, "/dashboard/products")}
                        className={cn(
                          "group flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                          pathname?.startsWith("/dashboard/products")
                            ? "bg-zinc-900 text-white"
                            : "text-gray-500 hover:bg-zinc-900 hover:text-white"
                        )}
                      >
                        <Package
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            pathname?.startsWith("/dashboard/products")
                              ? "text-red-600"
                              : "text-gray-500 group-hover:text-red-600"
                          )}
                        />
                        <span className="truncate">Products</span>
                      </Link>
                    </PermissionGate>
                  </div>
                )}
              </div>
            </li>
          )}

          {navRest.map(({ href, label, icon }) => {
            const active = pathname?.startsWith(href);
            const perm = ADMIN_LINK_PERM[href];

            const linkNode = (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    onClick={(e) => handleNavigation(e, href)}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                      active 
                        ? "bg-zinc-900 text-white before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-red-600 before:rounded-r" 
                        : "text-gray-400 hover:bg-zinc-900 hover:text-white",
                      collapsed && "justify-center"
                    )}
                  >
                    <IconByName name={icon} className={cn("h-5 w-5 shrink-0 transition-colors", active ? "text-red-600" : "text-gray-400 group-hover:text-red-600")} />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    <p>{label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );

            if (perm) {
              return (
                <li key={href}>
                  <PermissionGate route={perm} fallback={null}>
                    {linkNode}
                  </PermissionGate>
                </li>
              );
            }
            return <li key={href}>{linkNode}</li>;
          })}

          {nav_admin.map(({ href, label, icon }) => {
            const active = pathname?.startsWith(href);
            const perm = ADMIN_LINK_PERM[href];

            const linkNode = (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    onClick={(e) => handleNavigation(e, href)}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                      active 
                        ? "bg-zinc-900 text-white before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-red-600 before:rounded-r" 
                        : "text-gray-400 hover:bg-zinc-900 hover:text-white",
                      collapsed && "justify-center"
                    )}
                  >
                    <IconByName name={icon} className={cn("h-5 w-5 shrink-0 transition-colors", active ? "text-red-600" : "text-gray-400 group-hover:text-red-600")} />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    <p>{label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );

            if (perm) {
              return (
                <li key={href}>
                  <PermissionGate route={perm} fallback={null}>
                    {linkNode}
                  </PermissionGate>
                </li>
              );
            }
            return <li key={href}>{linkNode}</li>;
          })}
        </ul>
      </nav>

      <div className="lg:hidden px-2 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleLogout}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all w-full text-gray-400 hover:bg-zinc-900 hover:text-white",
                collapsed && "justify-center"
              )}
            >
              <LogOut className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-red-600 transition-colors" />
              {!collapsed && <span className="truncate">Log out</span>}
            </button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">
              <p>Log out</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      <div
        className={cn(
          "mt-auto px-5 py-4 text-[11px] text-gray-600",
          collapsed && "text-center px-0"
        )}
      >
        {!collapsed ? "© 2025 All Rights Reserved" : "© 2025"}
      </div>
    </div>
    </TooltipProvider>
  );
}
