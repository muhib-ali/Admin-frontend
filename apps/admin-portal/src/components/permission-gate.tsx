"use client";

import * as React from "react";
import { useHasPermission } from "@/hooks/use-permission";

export default function PermissionGate({
  route,
  children,
  fallback = null,
}: {
  route: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const allowed = useHasPermission(route);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return <>{allowed ? children : fallback}</>;
}
