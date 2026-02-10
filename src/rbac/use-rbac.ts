"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ENTITY_PERMS } from "./permissions-map";

type EntityKey = keyof typeof ENTITY_PERMS;

export function useEntityPerms(entity: EntityKey) {
  const { hasPermission } = useAuth();
  const PERM = ENTITY_PERMS[entity];

  return {
    canList:   !!('list' in PERM && hasPermission(PERM.list)),
    canCreate: !!('create' in PERM && hasPermission(PERM.create)),
    canRead:   !!('read' in PERM && hasPermission(PERM.read)),
    canUpdate: !!('update' in PERM && hasPermission(PERM.update)),
    canDelete: !!('delete' in PERM && hasPermission(PERM.delete)),
    canViewRolePerms:   entity === "roles" ? !!hasPermission(ENTITY_PERMS.roles.extras.getRolePerms) : false,
    canUpdateRolePerms: entity === "roles" ? !!hasPermission(ENTITY_PERMS.roles.extras.updateRolePerms) : false,
    PERM,
  };
}
