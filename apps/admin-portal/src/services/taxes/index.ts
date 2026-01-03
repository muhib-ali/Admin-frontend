import api from "../lib/api";

type TaxItem = {
  id: string;
  title: string;
  rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type TaxesListResponse = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: {
    taxes: TaxItem[];
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

type TaxItemResponse = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: TaxItem;
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

export async function listTaxes(
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
    api.get<TaxesListResponse>("/taxes/getAll", {
      params,
      signal: opts?.signal,
    })
  );
  
  return { 
    rows: data?.data?.taxes ?? [], 
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

export async function getTaxById(id: string) {
  const { data } = await with429Retry(() =>
    api.get<TaxItemResponse>(`/taxes/getById/${id}`)
  );
  return data.data;
}

export async function createTax(payload: {
  title: string;
  rate: number;
  is_active?: boolean;
}) {
  console.log("Service createTax payload:", payload);
  console.log("Service payload rate type:", typeof payload.rate);
  
  const body = sanitize(
    {
      title: payload.title?.trim(),
      rate: payload.rate,
      is_active: payload.is_active,
    },
    ["title", "rate", "is_active"]
  );

  console.log("Service sanitized body:", body);
  console.log("Service body rate type:", typeof body.rate);

  const { data } = await with429Retry(() =>
    api.post<TaxItemResponse>("/taxes/create", body)
  );
  return data.data;
}

export async function updateTax(payload: {
  id: string;
  title?: string;
  rate?: number;
  is_active?: boolean;
}) {
  const body = sanitize(
    {
      id: payload.id,
      title: payload.title?.trim(),
      rate: payload.rate,
      is_active: payload.is_active,
    },
    ["id", "title", "rate", "is_active"]
  );

  try {
    const { data } = await with429Retry(() =>
      api.put<TaxItemResponse>("/taxes/update", body)
    );
    return data.data;
  } catch {
    const { data } = await with429Retry(() =>
      api.post<TaxItemResponse>("/taxes/update", body)
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

export async function deleteTax(id: string) {
  const { data } = await with429Retry(() =>
    api.delete<DeleteResponse>("/taxes/delete", { data: { id } })
  );
  return data;
}
