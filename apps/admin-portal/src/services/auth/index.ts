import api from "../lib/api";
import Cookies from "js-cookie";
import { LoginCredentials, LoginResponse } from "@/types/auth.types";

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>(
      "/auth/login",
      credentials
    );

    if (data.status && data.data) {
      const accessExpiry = data.data.expires_at
        ? new Date(data.data.expires_at)
        : undefined;

      const cookieOptions: Cookies.CookieAttributes = {
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      };

      if (accessExpiry && !isNaN(accessExpiry.getTime())) {
        cookieOptions.expires = accessExpiry;
      }

      Cookies.set("access_token", data.data.token, cookieOptions);

      Cookies.set("refresh_token", data.data.refresh_token, {
        expires: 7,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      localStorage.setItem("user", JSON.stringify(data.data.user));
      localStorage.setItem(
        "permissions",
        JSON.stringify(data.data.modulesWithPermisssions)
      );
    }

    return data;
  },

  async logout() {
    try {
      
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      Cookies.remove("access_token", { path: "/" });
      Cookies.remove("refresh_token", { path: "/" });
      Cookies.remove("access_expires_at", { path: "/" });
      if (typeof window !== "undefined") {
        localStorage.removeItem("user");
        localStorage.removeItem("permissions");
        window.location.href = "/login";
      }
    }
  },

  isAuthenticated(): boolean {
    return !!Cookies.get("access_token");
  },

  getUser() {
    try {
      const s = localStorage.getItem("user");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  },

  getPermissions() {
    try {
      const s = localStorage.getItem("permissions");
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  },

  hasPermission(route: string): boolean {
    const permissions = this.getPermissions();
    return permissions.some((mod: any) =>
      mod.permissions?.some(
        (p: any) => p.is_allowed && (p.route === route || route.startsWith(p.route))
      )
    );
  },

  getMenuPermissions() {
    const permissions = this.getPermissions();
    const menuItems: any[] = [];

    permissions.forEach((module: any) => {
      const allowed = module.permissions?.filter(
        (p: any) => p.is_Show_in_menu && p.is_allowed
      );
      if (allowed?.length) {
        menuItems.push({
          module_name: module.module_name,
          module_slug: module.module_slug,
          permissions: allowed,
        });
      }
    });

    return menuItems;
  },
};
