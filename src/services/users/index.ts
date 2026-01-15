import api from "../lib/api";
import { extractBackendError } from "@/utils/functions";
import type {
  UsersListResponse,
  UserItemResponse,
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

export async function listUsers(
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
    api.get<UsersListResponse>("/users/getAll", {
      params,
      signal: opts?.signal,
    })
  );
  return { rows: data?.data?.users ?? [], pagination: data?.data?.pagination };
}

export async function getUserById(id: string) {
  const { data } = await with429Retry(() =>
    api.get<UserItemResponse>(`/users/getById/${id}`)
  );
  return data.data;
}

export async function createUser(payload: {
  name: string;
  email: string;
  password: string;
  roleId: string;
}) {
  const { data } = await with429Retry(() =>
    api.post<UserItemResponse>("/users/create", payload)
  );
  return data.data;
}

export async function updateUser(payload: {
  id: string;
  name?: string;
  email?: string;
  password?: string;
  roleId?: string;
}) {
  const { data } = await with429Retry(() =>
    api.put<UserItemResponse>("/users/update", payload)
  );
  return data.data;
}

export async function deleteUser(id: string) {
  const { data } = await with429Retry(() =>
    api.delete<UserItemResponse>("/users/delete", { data: { id } })
  );
  return data.data;
}

export const getAllUsers = async (params: any = {}) => {
  try {
    const response = await api.get("/users/getAll", { params });
    return response?.data;
  } catch (error: any) {
    console.error(
      "Failed to fetch users:",
      error?.response?.data?.message || error.message
    );
    return extractBackendError(error, "Users");
  }
};

export const addUser = async (data: any) => {
  try {
    const response = await api.post("/users/create", data);
    return response?.data;
  } catch (error: any) {
    console.error(
      "User creation failed:",
      error?.response?.data?.message || error.message
    );
    return extractBackendError(error, "Add User");
  }
};

export const deleteUserById = async (id: any) => {
  try {
    const response = await api.delete("/users/delete", { data: { id } });
    return response?.data;
  } catch (error: any) {
    console.error(
      "User deletion failed:",
      error?.response?.data?.message || error.message
    );
    return extractBackendError(error, "Users");
  }
};
