import api from "../lib/api";
import { extractBackendError } from "@/utils/functions";
import type {
  RolesListResponse,
  RoleItemResponse,
  RolePermsResponse,
  RoleModulePerm,
} from "@/types/admin.types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseRetryAfter(hdr?: string): number | null {
  if (!hdr) return null;
  const n = Number(hdr);
  return Number.isFinite(n) ? Math.max(0, n) : null;
}

async function with429Retry<T>(
  fn: () => Promise<T>,
  {
    retries = 4,
    baseDelayMs = 400,
    maxDelayMs = 8000,
  }: { retries?: number; baseDelayMs?: number; maxDelayMs?: number } = {}
) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e: any) {
      const status = e?.response?.status;
      const retryAfterHdr = e?.response?.headers?.["retry-after"] as string | undefined;
      const retryAfterSec = parseRetryAfter(retryAfterHdr);
      const canRetry = status === 429 && attempt < retries;
      if (!canRetry) throw e;

      let delayMs =
        retryAfterSec != null
          ? retryAfterSec * 1000
          : Math.min(maxDelayMs, Math.round(baseDelayMs * Math.pow(2, attempt)));
      const jitter = delayMs * (Math.random() * 0.4 - 0.2);
      delayMs = Math.max(200, Math.round(delayMs + jitter));
      await sleep(delayMs);
      attempt += 1;
      continue;
    }
  }
}

function sanitize<T extends object>(obj: T, allow: (keyof T)[]) {
  const out: any = {};
  for (const k of allow) {
    const v = (obj as any)[k];
    if (v !== undefined && v !== null) out[k as string] = v;
  }
  return out;
}

export async function listRoles(
  page = 1,
  limit = 10,
  search?: string,
  opts?: { signal?: AbortSignal }
) {
  const params = sanitize(
    { page, limit, search: search?.trim() || undefined },
    ["page", "limit", "search"]
  );
  const { data } = await with429Retry(() =>
    api.get<RolesListResponse>("/roles/getAll", {
      params,
      signal: opts?.signal,
    })
  );
  return { rows: data?.data?.roles ?? [], pagination: data?.data?.pagination };
}

export async function getRoleById(id: string) {
  const { data } = await with429Retry(() =>
    api.get<RoleItemResponse>(`/roles/getById/${id}`)
  );
  return data.data;
}

export async function createRole(payload: { title: string }) {
  const { data } = await with429Retry(() =>
    api.post<RoleItemResponse>("/roles/create", payload)
  );
  return data.data;
}

export async function updateRole(payload: { id: string; title?: string }) {
  const { data } = await with429Retry(() =>
    api.put<RoleItemResponse>("/roles/update", payload)
  );
  return data.data;
}

export async function deleteRole(id: string) {
  const { data } = await with429Retry(() =>
    api.delete<RoleItemResponse>("/roles/delete", { data: { id } })
  );
  return data.data;
}

export async function getRolePerms(roleId: string): Promise<RoleModulePerm[]> {
  const { data } = await with429Retry(() =>
    api.get<RolePermsResponse>(`/roles/getAllPermissionsByRoleId/${roleId}`)
  );
  return data.data.modulesWithPermisssions;
}

export async function updateRolePerms(input: {
  roleId: string;
  current: RoleModulePerm[];
  next: RoleModulePerm[];
}) {
  const modulesWithPermissions = input.next.map((m) => ({
    moduleSlug: m.module_slug,
    permissions: m.permissions.map((p) => ({
      id: p.id,
      permissionSlug: p.permission_slug,
      isAllowed: Boolean(p.is_allowed),
    })),
  }));

  const payload = {
    roleId: input.roleId,
    modulesWithPermissions,
  };

  const { data } = await with429Retry(() =>
    api.put<{ status: boolean; message: string }>(
      "/roles/updatePermissionsAccessByRoleId",
      payload
    )
  );
  return data;
}

export const getAllRoles = async (params: any = {}) => {
  try {
    const response = await api.get("/roles/getAll", { params });
    return response?.data;
  } catch (error: any) {
    console.error(
      "Failed to fetch roles:",
      error?.response?.data?.message || error.message
    );
    return extractBackendError(error, "Roles");
  }
};

export const addRole = async (data: any) => {
  try {
    const response = await api.post("/roles/create", data);
    return response?.data;
  } catch (error: any) {
    console.error(
      "Role creation failed:",
      error?.response?.data?.message || error.message
    );
    return extractBackendError(error, "Add Role");
  }
};

export const deleteRoleById = async (id: any) => {
  try {
    const response = await api.delete("/roles/delete", { data: { id } });
    return response?.data;
  } catch (error: any) {
    console.error(
      "Role deletion failed:",
      error?.response?.data?.message || error.message
    );
    return extractBackendError(error, "Roles");
  }
};

export const getAllPermissionsByRoleId = async (roleId: string) => {
  try {
    const response = await api.get(
      `/roles/getAllPermissionsByRoleId/${roleId}`
    );
    return response?.data;
  } catch (error: any) {
    console.error(
      "Failed to load role permissions:",
      error?.response?.data?.message || error.message
    );
    return extractBackendError(error, "Role Permissions");
  }
};

export const updatePermissionsAccessByRoleId = async (payload: any) => {
  try {
    const response = await api.put("/roles/updatePermissionsAccessByRoleId", payload);
    return response?.data;
  } catch (error: any) {
    console.error(
      "Failed to update role permissions:",
      error?.response?.data?.message || error.message
    );
    return extractBackendError(error, "Update Role Permissions");
  }
};
