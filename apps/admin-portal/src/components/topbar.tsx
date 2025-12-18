"use client";

import { useState } from "react";
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
  const { data: session } = useSession();
  const user = session?.user;

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
          className="hidden lg:grid h-10 w-10 place-items-center rounded-xl border bg-white shadow dark:bg-neutral-900"
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
              <DropdownMenuItem className="gap-2">
                <User2 className="h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Settings className="h-4 w-4" />
                Account Settings
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
