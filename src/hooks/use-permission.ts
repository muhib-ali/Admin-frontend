"use client";

import { useAuthSession } from "./use-auth-session";

export function useHasPermission(route: string | undefined | null) {
  const { hasPermission } = useAuthSession();
  return hasPermission(route);
}
