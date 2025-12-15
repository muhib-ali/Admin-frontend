import api from "../lib/api";
import { extractBackendError } from "@/utils/functions";

type ModuleItem = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ModulesListResponse = {
  status: boolean;
  statusCode: number;
  data: { modules: ModuleItem[]; pagination?: any };
};

type ModuleItemResponse = {
  status: boolean;
  statusCode: number;
  data: ModuleItem;
};

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
): Promise<T> {
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

export async function listModules(
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
    api.get<ModulesListResponse>("/modules/getAll", {
      params,
      signal: opts?.signal,
    })
  );
  return { rows: data?.data?.modules ?? [], pagination: data?.data?.pagination };
}

export async function getModuleById(id: string) {
  const { data } = await with429Retry(() =>
    api.get<ModuleItemResponse>(`/modules/getById/${id}`)
  );
  return data.data;
}

export async function createModule(payload: {
  title: string;
  slug: string;
  description?: string;
}) {
  const { data } = await with429Retry(() =>
    api.post<ModuleItemResponse>("/modules/create", payload)
  );
  return data.data;
}

export async function updateModule(payload: {
  id: string;
  title?: string;
  slug?: string;
  description?: string;
}) {
  try {
    const { data } = await with429Retry(() =>
      api.post<ModuleItemResponse>("/modules/update", payload)
    );
    return data.data;
  } catch {
    const { data } = await with429Retry(() =>
      api.put<ModuleItemResponse>("/modules/update", payload)
    );
    return data.data;
  }
}

export async function deleteModule(id: string) {
  const { data } = await with429Retry(() =>
    api.delete<ModuleItemResponse>("/modules/delete", { data: { id } })
  );
  return data.data;
}

export const getAllModules = async (params: any = {}) => {
  try {
    const response = await api.get("/modules/getAll", { params });
    return response?.data;
  } catch (error: any) {
    console.error(
      "Failed to fetch modules:",
      error?.response?.data?.message || error.message
    );
    return extractBackendError(error, "Modules");
  }
};

export const addModule = async (data: any) => {
  try {
    const response = await api.post("/modules/create", data);
    return response?.data;
  } catch (error: any) {
    console.error(
      "Module creation failed:",
      error?.response?.data?.message || error.message
    );
    return extractBackendError(error, "Add Module");
  }
};

export const deleteModuleById = async (id: any) => {
  try {
    const response = await api.delete("/modules/delete", { data: { id } });
    return response?.data;
  } catch (error: any) {
    console.error(
      "Module deletion failed:",
      error?.response?.data?.message || error.message
    );
    return extractBackendError(error, "Modules");
  }
};
