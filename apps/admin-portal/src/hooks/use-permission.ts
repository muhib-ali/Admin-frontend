"use client";

import { useAuthSession } from "./use-auth-session";

export function useHasPermission(route: string) {
  const { hasPermission } = useAuthSession();
  return hasPermission(route);
}
