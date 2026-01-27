"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import { Menu, X } from "lucide-react";
import { cn } from "@/utils/cn";

function TopLineLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);

  // Start loader immediately on navigation start
  useEffect(() => {
    const handleStart = () => {
      setLoading(true);
      setPageLoading(true);
    };
    
    const handleComplete = () => {
      setLoading(false);
      setPageLoading(false);
    };

    // Start immediately when pathname changes
    handleStart();
    
    // Complete when page is ready
    const t = setTimeout(() => {
      handleComplete();
    }, 1500);
    
    return () => clearTimeout(t);
  }, [pathname, searchParams]);

  // Also listen to browser navigation events
  useEffect(() => {
    const handleNavigationStart = () => {
      setLoading(true);
      setPageLoading(true);
    };

    // Listen for link clicks
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (link && link.href && !link.target && !link.hasAttribute('download')) {
        handleNavigationStart();
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed left-0 top-0 z-60 h-1.25 w-full bg-gray-200">
      <div className="h-full origin-left animate-[dashboardTopLoader_1500ms_ease-out] bg-red-600" />
    </div>
  );
}

export default function DashboardFrame({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <TopLineLoader />
      <aside
        className={cn(
          "fixed left-0 top-0 z-30 hidden h-screen overflow-hidden rounded-r-4xl bg-black text-white transition-[width] duration-300 lg:block",
          collapsed ? "w-20" : "w-72"
        )}
      >
        <Sidebar collapsed={collapsed} />
      </aside>

      <main
        className={cn(
          "relative min-h-screen min-w-0 flex flex-col",
          collapsed ? "lg:pl-20" : "lg:pl-72"
        )}
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b lg:hidden">
          <button
            aria-label="Open sidebar"
            onClick={() => setOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="font-semibold truncate">Dashboard</div>
        </div>

        <Topbar
          onMenuClick={() => setOpen(true)}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          collapsed={collapsed}
          className="hidden lg:block"
        />

        <div className="relative min-w-0 w-full max-w-7xl mx-auto p-4 sm:p-6 pt-6 pb-10">
          {children}
        </div>
      </main>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] overflow-hidden rounded-r-4xl bg-black text-white shadow-xl">
            <div className="flex items-center justify-between h-14 px-4 border-b">
              <div className="font-semibold">Menu</div>
              <button
                aria-label="Close sidebar"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[calc(100%-56px)] overflow-y-auto">
              <Sidebar />
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes dashboardTopLoader {
          0% {
            transform: scaleX(0);
            opacity: 1;
          }
          50% {
            transform: scaleX(0.6);
            opacity: 1;
          }
          100% {
            transform: scaleX(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
