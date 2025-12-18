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
  ShieldCheck,
  Shield,
  LogOut,
  Coins,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import PermissionGate from "@/components/permission-gate";
import { ADMIN_LINK_PERM } from "@/rbac/link-permissions";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";

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
  ShieldCheck,
  Shield,
  LogOut,
} as const;

type IconName = keyof typeof ICONS;

export const nav = [
  { href: "/dashboard/dashboard", label: "Dashboard", icon: "BarChart2" as IconName },
  { href: "/dashboard/invoices", label: "Invoices", icon: "FileText" as IconName },
  { href: "/dashboard/quotations", label: "Quotations", icon: "Receipt" as IconName },
  { href: "/dashboard/clients", label: "Clients", icon: "Users" as IconName },
  { href: "/dashboard/customers", label: "Customers", icon: "Users" as IconName },
  { href: "/dashboard/products", label: "Products", icon: "Package" as IconName },
];

export const nav_admin = [
  { href: "/dashboard/jobFiles", label: "Job files", icon: "Tag" as IconName },
  { href: "/dashboard/tax", label: "Tax", icon: "BadgePercent" as IconName },
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

type Props = { collapsed?: boolean };

export default function Sidebar({ collapsed = false }: Props) {
  const pathname = usePathname();
  const { hasUnsavedChanges } = useUnsavedChanges();
  const { data: session } = useSession();

  const [orderMgmtOpen, setOrderMgmtOpen] = React.useState(false);
  const [productMgmtOpen, setProductMgmtOpen] = React.useState(false);

  const dashboardItem = React.useMemo(
    () => nav.find((i) => i.href === "/dashboard/dashboard"),
    []
  );
  const navRest = React.useMemo(
    () =>
      nav.filter(
        (i) => i.href !== "/dashboard/dashboard" && i.href !== "/dashboard/products"
      ),
    []
  );

  const orderMgmtLinks = React.useMemo(
    () =>
      [
        { href: "/dashboard/orders", label: "Orders" },
        { href: "/dashboard/bulk-orders", label: "Bulk Orders" },
      ] as const,
    []
  );

  React.useEffect(() => {
    if (!pathname) return;
    if (
      pathname.startsWith("/dashboard/orders") ||
      pathname.startsWith("/dashboard/bulk-orders")
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
    <div
      className={cn(
        "flex h-full min-h-0 flex-col max-w-full overflow-hidden",
        collapsed ? "w-20" : "w-72"
      )}
    >
      <div className={cn("px-5 py-5", collapsed && "px-3")}>
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <div className={cn("text-2xl font-bold text-white", collapsed && "text-lg")}>
            {!collapsed ? "Admin Dashboard" : "AD"}
          </div>
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
              "text-xs rounded-2xl px-4 text-white/90 py-1",
              collapsed && "mx-2 text-center px-2"
            )}
          >
            {!collapsed ? "Navigation" : "Nav"}
          </li>

          {dashboardItem && (() => {
            const { href, label, icon } = dashboardItem;
            const active = pathname?.startsWith(href);
            const perm = ADMIN_LINK_PERM[href];

            const dashboardLink = (
              <Link
                href={href}
                onClick={(e) => handleNavigation(e, href)}
                className={cn(
                  "group flex items-center gap-3 rounded-l-2xl px-4 py-2.5 text-sm transition",
                  active ? "bg-[#ebf3f7] text-nav-txt" : "hover:bg-white/10",
                  collapsed && "justify-center"
                )}
              >
                <IconByName name={icon} className="h-5 w-5 shrink-0 text-red-400" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
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

          {!collapsed && (
            <li>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setOrderMgmtOpen((v) => !v)}
                  className={cn(
                    "group flex w-full items-center justify-between gap-3 rounded-l-2xl px-4 py-2.5 text-sm transition",
                    (pathname?.startsWith("/dashboard/orders") ||
                      pathname?.startsWith("/dashboard/bulk-orders"))
                      ? "bg-[#ebf3f7] text-nav-txt"
                      : "hover:bg-white/10"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <ShoppingCart className="h-5 w-5 shrink-0 text-red-400" />
                    <span className="truncate">Order Management</span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 opacity-70 transition-transform",
                      orderMgmtOpen && "rotate-180"
                    )}
                  />
                </button>

                {orderMgmtOpen && (
                  <div className="mt-1 space-y-1 pl-8">
                    {orderMgmtLinks.map((c) => {
                      const childActive = pathname?.startsWith(c.href);
                      return (
                        <Link
                          key={c.href}
                          href={c.href}
                          onClick={(e) => handleNavigation(e, c.href)}
                          className={cn(
                            "group flex items-center gap-2 rounded-l-2xl px-4 py-2 text-sm transition",
                            childActive
                              ? "bg-[#ebf3f7] text-nav-txt"
                              : "hover:bg-white/10"
                          )}
                        >
                          <ChevronRight className="h-4 w-4 shrink-0 text-red-400" />
                          <span className="truncate">{c.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </li>
          )}

          {!collapsed && (
            <li>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setProductMgmtOpen((v) => !v)}
                  className={cn(
                    "group flex w-full items-center justify-between gap-3 rounded-l-2xl px-4 py-2.5 text-sm transition",
                    (pathname?.startsWith("/dashboard/categories") ||
                      pathname?.startsWith("/dashboard/brands") ||
                      pathname?.startsWith("/dashboard/products"))
                      ? "bg-[#ebf3f7] text-nav-txt"
                      : "hover:bg-white/10"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Store className="h-5 w-5 shrink-0 text-red-400" />
                    <span className="truncate">Product Management</span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 opacity-70 transition-transform",
                      productMgmtOpen && "rotate-180"
                    )}
                  />
                </button>

                {productMgmtOpen && (
                  <div className="mt-1 space-y-1 pl-8">
                    <Link
                      href="/dashboard/categories"
                      onClick={(e) => handleNavigation(e, "/dashboard/categories")}
                      className={cn(
                        "group flex items-center gap-2 rounded-l-2xl px-4 py-2 text-sm transition",
                        pathname?.startsWith("/dashboard/categories")
                          ? "bg-[#ebf3f7] text-nav-txt"
                          : "hover:bg-white/10"
                      )}
                    >
                      <FolderTree className="h-4 w-4 shrink-0 text-red-400" />
                      <span className="truncate">Categories</span>
                    </Link>

                    <Link
                      href="/dashboard/brands"
                      onClick={(e) => handleNavigation(e, "/dashboard/brands")}
                      className={cn(
                        "group flex items-center gap-2 rounded-l-2xl px-4 py-2 text-sm transition",
                        pathname?.startsWith("/dashboard/brands")
                          ? "bg-[#ebf3f7] text-nav-txt"
                          : "hover:bg-white/10"
                      )}
                    >
                      <Tags className="h-4 w-4 shrink-0 text-red-400" />
                      <span className="truncate">Brands</span>
                    </Link>

                    <Link
                      href="/dashboard/products"
                      onClick={(e) => handleNavigation(e, "/dashboard/products")}
                      className={cn(
                        "group flex items-center gap-2 rounded-l-2xl px-4 py-2 text-sm transition",
                        pathname?.startsWith("/dashboard/products")
                          ? "bg-[#ebf3f7] text-nav-txt"
                          : "hover:bg-white/10"
                      )}
                    >
                      <Package className="h-4 w-4 shrink-0 text-red-400" />
                      <span className="truncate">Products</span>
                    </Link>
                  </div>
                )}
              </div>
            </li>
          )}

          {navRest.map(({ href, label, icon }) => {
            const active = pathname?.startsWith(href);
            const perm = ADMIN_LINK_PERM[href];

            const linkNode = (
              <Link
                href={href}
                onClick={(e) => handleNavigation(e, href)}
                className={cn(
                  "group flex items-center gap-3 rounded-l-2xl px-4 py-2.5 text-sm transition",
                  active ? "bg-[#ebf3f7] text-nav-txt" : "hover:bg-white/10",
                  collapsed && "justify-center"
                )}
              >
                <IconByName name={icon} className="h-5 w-5 shrink-0 text-red-400" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
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
              <Link
                href={href}
                onClick={(e) => handleNavigation(e, href)}
                className={cn(
                  "group flex items-center gap-3 rounded-l-2xl px-4 py-2.5 text-sm transition",
                  active ? "bg-[#ebf3f7] text-nav-txt" : "hover:bg-white/10",
                  collapsed && "justify-center"
                )}
              >
                <IconByName name={icon} className="h-5 w-5 shrink-0 text-red-400" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
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
        <button
          onClick={handleLogout}
          className="group flex items-center gap-3 rounded-l-2xl px-4 py-2.5 text-sm transition w-full hover:bg-white/10 text-white/90"
        >
          <LogOut className="h-5 w-5 shrink-0 text-red-400" />
          {!collapsed && <span className="truncate">Log out</span>}
        </button>
      </div>

      <div
        className={cn(
          "mt-auto px-5 py-4 text-[11px] opacity-80",
          collapsed && "text-center px-0"
        )}
      >
        {!collapsed ? "© 2025 All Rights Reserved" : "© 2025"}
      </div>
    </div>
  );
}
