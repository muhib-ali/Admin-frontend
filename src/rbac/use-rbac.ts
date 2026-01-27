"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ENTITY_PERMS } from "./permissions-map";

type EntityKey = keyof typeof ENTITY_PERMS;

export function useEntityPerms(entity: EntityKey) {
  const { hasPermission } = useAuth();
  const PERM = ENTITY_PERMS[entity];

  return {
    canList:   !!hasPermission(PERM.list),
    canCreate: !!hasPermission((PERM as any).create),
    canRead:   !!hasPermission(PERM.read),
    canUpdate: !!hasPermission((PERM as any).update),
    canDelete: !!hasPermission((PERM as any).delete),
    canViewRolePerms:   entity === "roles" ? !!hasPermission(ENTITY_PERMS.roles.extras.getRolePerms) : false,
    canUpdateRolePerms: entity === "roles" ? !!hasPermission(ENTITY_PERMS.roles.extras.updateRolePerms) : false,
    PERM,
  };
}
