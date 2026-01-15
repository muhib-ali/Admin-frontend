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
      // Dispatch event to notify components of logout
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userLoggedOut', {
          detail: { message: 'User logged out' }
        }));
      }
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      Cookies.remove("access_token", { path: "/" });
      Cookies.remove("refresh_token", { path: "/" });
      Cookies.remove("access_expires_at", { path: "/" });
      if (typeof window !== 'undefined') {
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

  async updateProfile(profileData: {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  }) {
    console.log("Auth service updateProfile called with:", profileData);
    
    // Validate that at least one field is provided
    if (!profileData.name && !profileData.newPassword) {
      throw new Error("At least one field (name or password) must be provided for update");
    }

    // Only include provided fields in the request
    const requestData: any = {};
    if (profileData.name) requestData.name = profileData.name;
    if (profileData.currentPassword) requestData.currentPassword = profileData.currentPassword;
    if (profileData.newPassword) requestData.newPassword = profileData.newPassword;

    console.log("Sending request data:", requestData);

    const { data } = await api.put("/auth/profile", requestData);
    
    console.log("API response received:", data);
    
    // Update user data in localStorage if profile was updated successfully
    if (data.status && data.data) {
      const currentUser = this.getUser();
      console.log("Current user from localStorage:", currentUser);
      
      if (currentUser) {
        const updatedUser = { ...currentUser, ...data.data };
        console.log("Updated user to save:", updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
    }
    
    return data;
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
