import api from "../lib/api";

type WarehouseItem = {
  id: string;
  name: string;
  code: string;
  address: string;
  is_active: boolean;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

type WarehousesListResponse = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: {
    warehouses: WarehouseItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
      nextPage?: number;
      prevPage?: number;
    };
  };
};

type WarehouseItemResponse = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: WarehouseItem;
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

export async function listWarehouses(
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
    api.get<WarehousesListResponse>("/warehouses/getAll", {
      params,
      signal: opts?.signal,
    })
  );
  
  return { 
    rows: data?.data?.warehouses ?? [], 
    pagination: data?.data?.pagination ?? {
      page: page,
      limit: limit,
      total: 0,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  };
}

export async function getWarehouseById(id: string) {
  const { data } = await with429Retry(() =>
    api.get<WarehouseItemResponse>(`/warehouses/getById/${id}`)
  );
  return data.data;
}

export async function createWarehouse(payload: {
  name: string;
  code: string;
  address: string;
  is_active?: boolean;
}) {
  const body = sanitize(
    {
      name: payload.name?.trim(),
      code: payload.code?.trim(),
      address: payload.address?.trim(),
      is_active: payload.is_active,
    },
    ["name", "code", "address", "is_active"]
  );

  const { data } = await with429Retry(() =>
    api.post<WarehouseItemResponse>("/warehouses/create", body)
  );
  return data.data;
}

export async function updateWarehouse(payload: {
  id: string;
  name?: string;
  code?: string;
  address?: string;
  is_active?: boolean;
}) {
  const body = sanitize(
    {
      id: payload.id,
      name: payload.name?.trim(),
      code: payload.code?.trim(),
      address: payload.address?.trim(),
      is_active: payload.is_active,
    },
    ["id", "name", "code", "address", "is_active"]
  );

  try {
    const { data } = await with429Retry(() =>
      api.put<WarehouseItemResponse>("/warehouses/update", body)
    );
    return data.data;
  } catch {
    const { data } = await with429Retry(() =>
      api.post<WarehouseItemResponse>("/warehouses/update", body)
    );
    return data.data;
  }
}

type DeleteResponse = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: null;
};

export async function deleteWarehouse(id: string) {
  const { data } = await with429Retry(() =>
    api.delete<DeleteResponse>("/warehouses/delete", { data: { id } })
  );
  return data;
}
