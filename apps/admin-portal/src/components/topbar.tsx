"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Settings,
  User2,
} from "lucide-react";
import CurrencySelector from "./currency-selector";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "next-auth/react";

type TopbarProps = {
  onMenuClick?: () => void;
  onToggleSidebar?: () => void;
  collapsed?: boolean;
  className?: string;
};

export default function Topbar({ onMenuClick, onToggleSidebar, collapsed, className }: TopbarProps) {
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const { data: session, update } = useSession();
  const [localUser, setLocalUser] = React.useState<any>(null);
  const router = useRouter();

  // Get user from localStorage as fallback
  React.useEffect(() => {
    const getUserFromStorage = () => {
      try {
        const s = localStorage.getItem("user");
        return s ? JSON.parse(s) : null;
      } catch {
        return null;
      }
    };

    const storedUser = getUserFromStorage();
    setLocalUser(storedUser);
  }, []);

  // Use localUser first (updated by events), fallback to session user
  const user = localUser || session?.user;

  // Debug: Log session data changes
  useEffect(() => {
    console.log("Topbar session updated:", session);
    console.log("Topbar localUser:", localUser);
    console.log("Topbar final user:", user);
  }, [session, localUser, user]);

  // Listen for profile updates
  useEffect(() => {
    console.log("Setting up profile update event listener");
    
    const handleProfileUpdate = (event: CustomEvent) => {
      console.log('🔥 Profile update event received!', event.detail);
      
      // Update localStorage immediately
      const updatedUser = event.detail.user;
      console.log('🔥 Updating localStorage with:', updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setLocalUser(updatedUser);
      
      // Also try to update NextAuth session
      console.log('🔥 Attempting NextAuth session update...');
      update().then((newSession) => {
        console.log("🔥 Session after update:", newSession);
      }).catch((err) => {
        console.log("🔥 Session update failed, but localStorage updated:", err);
      });
    };

    // Listen for user login events (when switching accounts)
    const handleUserLogin = (event: CustomEvent) => {
      console.log('🔥 User login event received!', event.detail);
      
      // Update local state with new user data
      const newUser = event.detail.user;
      console.log('🔥 Updating localUser with new login:', newUser);
      setLocalUser(newUser);
    };

    // Listen for logout events
    const handleUserLogout = (event: CustomEvent) => {
      console.log('🔥 User logout event received!', event.detail);
      
      // Clear local state
      setLocalUser(null);
    };

    // Add event listeners
    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
    window.addEventListener('userLoggedIn', handleUserLogin as EventListener);
    window.addEventListener('userLoggedOut', handleUserLogout as EventListener);
    console.log("🔥 Event listeners added for profileUpdated, userLoggedIn, and userLoggedOut");
    
    return () => {
      console.log("🔥 Cleaning up event listeners");
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
      window.removeEventListener('userLoggedIn', handleUserLogin as EventListener);
      window.removeEventListener('userLoggedOut', handleUserLogout as EventListener);
    };
  }, [update]);

  // Also listen for storage changes as backup
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        console.log('🔥 Storage change detected for user key');
        try {
          const newUser = JSON.parse(e.newValue || '{}');
          setLocalUser(newUser);
          console.log('🔥 Updated localUser from storage change:', newUser);
        } catch (err) {
          console.error('🔥 Error parsing storage change:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut({ redirectTo: "/login" });
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  return (
    <div className={`sticky top-0 z-20 border-b bg-[#f6f7fb]/80 backdrop-blur dark:bg-neutral-950/80 ${className || ''}`}>
      <div className="mx-auto flex max-w-7xl items-center gap-3 sm:gap-4 px-3 sm:px-4 md:px-6 py-3 md:py-4 min-w-0">
        <button
          onClick={onMenuClick}
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-neutral-700 shadow lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          onClick={onToggleSidebar}
          className={`hidden lg:grid h-10 w-10 place-items-center rounded-xl border bg-white shadow dark:bg-neutral-900 transition-[margin] duration-300 ${collapsed ? "-ml-14" : "ml-0"}`}
          aria-label="Toggle sidebar"
          title="Collapse / Expand sidebar"
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>

        <div className="flex-1 min-w-0" />

        <div className="hidden md:flex items-center gap-2 rounded-full border bg-white px-3 sm:px-4 py-2 shadow-sm dark:bg-neutral-900 max-w-[640px] w-full">
          <Search className="h-4 w-4 opacity-60 shrink-0" />
          <Input
            className="w-full border-0 p-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
            placeholder="Search something here..."
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <CurrencySelector />

          <Button
            variant="outline"
            size="icon"
            className="rounded-full md:hidden"
            aria-label="Toggle search"
            onClick={() => setShowMobileSearch((s) => !s)}
          >
            <Search className="h-4 w-4" />
          </Button>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                className="grid h-10 w-10 place-items-center rounded-full border bg-red-600 text-white shadow"
                aria-label="User menu"
                title={user?.email || "User"}
              >
                <span className="text-xs font-bold">
                  {(user?.name || user?.email || "AD").slice(0, 2).toUpperCase()}
                </span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              side="bottom"
              sideOffset={8}
              className="z-100 w-[min(92vw,240px)] rounded-xl p-0 overflow-hidden"
              avoidCollisions
              collisionPadding={8}
            >
              <div className="px-4 py-3">
                <div className="font-semibold">{user?.name || "Admin User"}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {user?.email || "admin@example.com"}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2"
                onSelect={(e) => {
                  e.preventDefault();
                  router.push("/dashboard/account-settings");
                }}
              >
                <User2 className="h-4 w-4" />
                Profile Setting
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-red-600 focus:text-red-600"
                onSelect={(e) => {
                  e.preventDefault();
                  handleLogout();
                }}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showMobileSearch && (
        <div className="px-3 sm:px-4 md:px-6 pb-3 md:hidden">
          <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-2 shadow-sm dark:bg-neutral-900">
            <Search className="h-4 w-4 opacity-60 shrink-0" />
            <Input
              className="w-full border-0 p-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
              placeholder="Search something here..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
