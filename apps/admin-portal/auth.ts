import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import type { Role, Module, Permission } from "@/types/auth.types";

type CompactPermission = [string, 0 | 1, 0 | 1, string, string];
type CompactModule = [string, string, CompactPermission[]];

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
    };
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    permissions?: Module[];
  }
}

interface ExtendedJWT extends JWT {
  id?: string;
  name?: string;
  email?: string;
  role?: Role;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  permissionsCompact?: CompactModule[];
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        try {
          const baseURL = process.env.NEXT_PUBLIC_API_URL;
          if (!baseURL) {
            throw new Error("NEXT_PUBLIC_API_URL is not configured");
          }

          const response = await fetch(`${baseURL}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Login failed");
          }

          const data = await response.json();

          if (!data.status || !data.data) {
            throw new Error(data.message || "Login failed");
          }

          const apiUser = data.data.user;
          const apiToken = data.data.token;
          const apiRefresh = data.data.refresh_token;
          const apiExpires = data.data.expires_at;
          const apiModules = data.data.modulesWithPermisssions || [];

          const compactModules: CompactModule[] = apiModules.map(
            (mod: any): CompactModule => [
              mod.module_name,
              mod.module_slug,
              (mod.permissions || []).map(
                (p: any): CompactPermission => [
                  p.route,
                  p.is_allowed ? 1 : 0,
                  p.is_Show_in_menu ? 1 : 0,
                  p.permission_name,
                  p.permission_slug,
                ]
              ),
            ]
          );

          return {
            id: apiUser.id,
            name: apiUser.name,
            email: apiUser.email,
            role: apiUser.role,
            token: apiToken,
            refresh_token: apiRefresh,
            expires_at: apiExpires,
            permissionsCompact: compactModules,
            // Store user data and permissions in localStorage for components that rely on it
            userData: apiUser,
            permissionsData: apiModules,
          };
        } catch (error: any) {
          console.error("Auth error:", error);
          throw new Error(error.message || "Authentication failed");
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }): Promise<ExtendedJWT> {
      const extendedToken = token as ExtendedJWT;

      if (user) {
        extendedToken.id = (user as any).id;
        extendedToken.name = (user as any).name;
        extendedToken.email = (user as any).email;
        extendedToken.role = (user as any).role;
        extendedToken.accessToken = (user as any).token;
        extendedToken.refreshToken = (user as any).refresh_token;
        extendedToken.expiresAt = (user as any).expires_at;
        extendedToken.permissionsCompact =
          (user as any).permissionsCompact || [];
        
        // Update localStorage with new user data when logging in
        if (typeof window !== 'undefined' && (user as any).userData) {
          console.log('🔄 Updating localStorage with new user data on login');
          localStorage.setItem("user", JSON.stringify((user as any).userData));
          localStorage.setItem("permissions", JSON.stringify((user as any).permissionsData || []));
          
          // Dispatch event to notify components of user data change
          window.dispatchEvent(new CustomEvent('userLoggedIn', {
            detail: { user: (user as any).userData, permissions: (user as any).permissionsData || [] }
          }));
        }
        
        return extendedToken;
      }

      if (trigger === "update" && session) {
        return {
          ...extendedToken,
          ...(session as any),
        };
      }

      if (extendedToken.expiresAt && extendedToken.refreshToken) {
        const expiresAt = new Date(extendedToken.expiresAt);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        const fiveMinutes = 5 * 60 * 1000;

        if (timeUntilExpiry < fiveMinutes) {
          try {
            const baseURL = process.env.NEXT_PUBLIC_API_URL;

            const response = await fetch(`${baseURL}/auth/refresh`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                refresh_token: extendedToken.refreshToken,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              if (data?.status && data?.data?.token) {
                extendedToken.accessToken = data.data.token;
                extendedToken.expiresAt = data.data.expires_at;
                if (data.data.refresh_token) {
                  extendedToken.refreshToken = data.data.refresh_token;
                }
              }
            }
          } catch (err) {
            console.error("[NextAuth] Token refresh failed:", err);
          }
        }
      }

      return extendedToken;
    },

    async session({ session, token }) {
      const extendedToken = token as ExtendedJWT;

      if (session.user) {
        session.user.id = extendedToken.id || "";
        session.user.name = extendedToken.name || "";
        session.user.email = extendedToken.email || "";
        (session.user as any).role = extendedToken.role || ({} as Role);

        (session as any).accessToken = extendedToken.accessToken || "";
        (session as any).refreshToken = extendedToken.refreshToken || "";
        (session as any).expiresAt = extendedToken.expiresAt || "";

        const compactModules = extendedToken.permissionsCompact || [];
        const fullModules: Module[] = compactModules.map(
          ([module_name, module_slug, perms]): Module => ({
            module_name,
            module_slug,
            permissions: perms.map(
              ([route, allowed, showInMenu, permission_name, permission_slug]):
                Permission => ({
                  route,
                  is_allowed: Boolean(allowed),
                  is_Show_in_menu: Boolean(showInMenu),
                  permission_name,
                  permission_slug,
                })
            ),
          })
        );

        (session as any).permissions = fullModules;
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
});
