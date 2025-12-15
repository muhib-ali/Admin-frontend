"use client";

import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import type { Module, Permission } from "@/types/auth.types";

type SessionWithPermissions = Session & {
  permissions?: Module[];
};

export function useAuthSession() {
  const { data, status } = useSession();
  const session = (data ?? null) as SessionWithPermissions | null;

  const hasPermission = (route: string): boolean => {
    if (!session?.permissions) return false;

    return session.permissions.some((mod) =>
      mod.permissions?.some(
        (p) =>
          p.is_allowed &&
          (p.route === route || route.startsWith(p.route))
      )
    );
  };

  const getMenuPermissions = () => {
    if (!session?.permissions) return [];

    const menuItems: {
      module_name: string;
      module_slug: string;
      permissions: Permission[];
    }[] = [];

    session.permissions.forEach((module) => {
      const allowed: Permission[] = (module.permissions ?? []).filter(
        (p) => p.is_Show_in_menu && p.is_allowed
      );

      if (allowed.length) {
        menuItems.push({
          module_name: module.module_name,
          module_slug: module.module_slug,
          permissions: allowed,
        });
      }
    });

    return menuItems;
  };

  return {
    user: session?.user ?? null,
    permissions: session?.permissions ?? [],
    loading: status === "loading",
    hasPermission,
    getMenuPermissions,
  };
}
