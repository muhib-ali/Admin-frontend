import api from "../lib/api";
import { extractBackendError } from "@/utils/functions";

export type PermissionItem = {
  id: string;
  moduleId: string;
  title: string;
  slug: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type PermissionsListResponse = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: {
    permissions: PermissionItem[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
      nextPage: number | null;
      prevPage: number | null;
    };
  };
};

type PermissionItemResponse = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: PermissionItem;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseRetryAfter(h?: string | number): number | null {
  if (h == null) return null;
  if (typeof h === "number") return h;
  const s = String(h).trim();
  const secs = Number(s);
  if (!Number.isNaN(secs)) return Math.max(0, secs);
  const d = Date.parse(s);
  if (!Number.isNaN(d)) {
    const deltaMs = d - Date.now();
    return Math.max(0, Math.ceil(deltaMs / 1000));
  }
  return null;
}

async function with429Retry<T>(
  fn: () => Promise<T>,
  {
    retries = 4,
    baseDelayMs = 400,
    maxDelayMs = 8000,
  }: { retries?: number; baseDelayMs?: number; maxDelayMs?: number } = {}
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e: any) {
      const status = e?.response?.status;
      const retryAfterHdr = e?.response?.headers?.["retry-after"];
      const retryAfterSec = parseRetryAfter(retryAfterHdr);
      const canRetry = status === 429 && attempt < retries;

      if (!canRetry) throw e;

      let delayMs =
        retryAfterSec != null
          ? retryAfterSec * 1000
          : Math.min(
              maxDelayMs,
              Math.round(baseDelayMs * Math.pow(2, attempt))
            );

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

function normalizeSlug(slug: string) {
  return String(slug)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-");
}

function normalizePermissionItem(u: any): PermissionItem {
  return {
    id: u.id,
    moduleId: u.moduleId ?? u.module_id ?? (u.module && u.module.id) ?? "",
    title: u.title,
    slug: u.slug,
    description: u.description ?? undefined,
    is_active: u.is_active,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

export async function listPermissions(
  params: {
    page?: number;
    limit?: number;
    moduleId?: string;
  },
  opts?: { signal?: AbortSignal }
) {
  const page = params?.page ?? 1;
  const limit = Math.min(params?.limit ?? 10, 100);
  const moduleId = params?.moduleId;

  const { data } = await with429Retry(() =>
    api.get<PermissionsListResponse>("/permissions/getAll", {
      params: sanitize({ page, limit, moduleId }, ["page", "limit", "moduleId"]),
      signal: opts?.signal,
    })
  );
  const raw = data?.data?.permissions ?? [];
  return {
    rows: raw.map(normalizePermissionItem),
    pagination: data?.data?.pagination,
  };
}

export async function listPermissionsByModuleId(
  moduleId: string,
  opts?: { signal?: AbortSignal }
) {
  const all: PermissionItem[] = [];
  let page = 1;

  for (;;) {
    const { rows, pagination } = await listPermissions(
      { page, limit: 100, moduleId },
      opts
    );
    all.push(...rows);

    const hasNext = pagination?.hasNext ?? rows.length === 100;
    if (!hasNext) break;

    await sleep(150);
    page += 1;
  }
  return all;
}

export async function getPermissionById(id: string, opts?: { signal?: AbortSignal }) {
  const { data } = await with429Retry(() =>
    api.get<PermissionItemResponse>(`/permissions/getById/${id}`, {
      signal: opts?.signal,
    })
  );
  return normalizePermissionItem(data.data);
}

export async function createPermission(input: {
  moduleId: string;
  title: string;
  slug: string;
  description?: string;
}) {
  const body = sanitize(
    {
      moduleId: input.moduleId,
      title: input.title?.trim(),
      slug: normalizeSlug(input.slug),
      description: input.description?.trim(),
    },
    ["moduleId", "title", "slug", "description"]
  );

  try {
    const { data } = await with429Retry(() =>
      api.post<PermissionItemResponse>("/permissions/create", body)
    );
    return data.data;
  } catch {
    const { data } = await with429Retry(() =>
      api.put<PermissionItemResponse>("/permissions/create", body)
    );
    return data.data;
  }
}

export async function updatePermission(input: {
  id: string;
  moduleId: string;
  title: string;
  slug: string;
  description?: string;
  is_active?: boolean;
}) {
  const body = sanitize(
    {
      id: input.id,
      moduleId: input.moduleId,
      title: input.title?.trim(),
      slug: normalizeSlug(input.slug),
      description: input.description?.trim(),
      is_active: input.is_active,
    },
    ["id", "moduleId", "title", "slug", "description", "is_active"]
  );

  const { data } = await with429Retry(() =>
    api.put<PermissionItemResponse>("/permissions/update", body)
  );
  return data.data;
}

export async function deletePermission(id: string) {
  const { data } = await with429Retry(() =>
    api.delete<PermissionItemResponse>("/permissions/delete", {
      data: { id },
    })
  );
  return data.data;
}

export const getAllPermissions = async (params: any = {}) => {
  try {
    const response = await api.get("/permissions/getAll", { params });
    return response?.data;
  } catch (error: any) {
    console.error(
      "Failed to fetch permissions:",
      error?.response?.data?.message || error.message
    );
    return extractBackendError(error, "Permissions");
  }
};

export const addPermission = async (data: any) => {
  try {
    const response = await api.post("/permissions/create", data);
    return response?.data;
  } catch (error: any) {
    console.error(
      "Permission creation failed:",
      error?.response?.data?.message || error.message
    );
    return extractBackendError(error, "Add Permission");
  }
};

export const deletePermissionById = async (id: any) => {
  try {
    const response = await api.delete("/permissions/delete", { data: { id } });
    return response?.data;
  } catch (error: any) {
    console.error(
      "Permission deletion failed:",
      error?.response?.data?.message || error.message
    );
    return extractBackendError(error, "Permissions");
  }
};
