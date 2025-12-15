"use client";

import * as React from "react";
import { cn } from "@/utils/cn";
import { useScreenPermission } from "@/hooks/use-screen-perm";
import Unauthorized from "@/components/unauthorized";

type Props = {
  screen?: string;
  mode?: "soft" | "block";
  className?: string;
  children: React.ReactNode;
  unauthorizedMsg?: string;
};

export default function PermissionBoundary({
  screen,
  mode = "soft",
  className,
  children,
  unauthorizedMsg = "You don't have access to this page. Please go back",
}: Props) {
  const { allowed } = useScreenPermission(screen);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (allowed) return <>{children}</>;

  if (mode === "block") {
    return (
      <div className={cn("relative", className)}>
        <Unauthorized msg={unauthorizedMsg} />
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Unauthorized msg={unauthorizedMsg} />
      <div className="relative">
        {children}
        <div
          aria-hidden
          className="pointer-events-auto fixed inset-0 z-40"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="pointer-events-none fixed inset-0 z-30 bg-transparent" />
    </div>
  );
}
