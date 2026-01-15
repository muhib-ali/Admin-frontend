import api from "../lib/api";

type CategoryItem = {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

type CategoriesListResponse = {
  status: boolean;
  statusCode: number;
  data: { categories: CategoryItem[]; pagination?: any };
};

type CategoryItemResponse = {
  status: boolean;
  statusCode: number;
  data: CategoryItem;
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
      const retryAfterHdr = e?.response?.headers?.["retry-after"] as
        | string
        | undefined;
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

export async function listCategories(
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
    api.get<CategoriesListResponse>("/categories/getAll", {
      params,
      signal: opts?.signal,
    })
  );
  return {
    rows: data?.data?.categories ?? [],
    pagination: data?.data?.pagination,
  };
}

export async function getCategoryById(id: string) {
  const { data } = await with429Retry(() =>
    api.get<CategoryItemResponse>(`/categories/getById/${id}`)
  );
  return data.data;
}

export async function createCategory(payload: {
  name: string;
  description?: string;
  isActive?: boolean;
}) {
  const { data } = await with429Retry(() =>
    api.post<CategoryItemResponse>("/categories/create", payload)
  );
  return data.data;
}

export async function updateCategory(payload: {
  id: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}) {
  try {
    const { data } = await with429Retry(() =>
      api.put<CategoryItemResponse>("/categories/update", payload)
    );
    return data.data;
  } catch {
    const { data } = await with429Retry(() =>
      api.post<CategoryItemResponse>("/categories/update", payload)
    );
    return data.data;
  }
}

export async function deleteCategory(id: string) {
  const { data } = await with429Retry(() =>
    api.delete<CategoryItemResponse>("/categories/delete", { data: { id } })
  );
  return data.data;
}
