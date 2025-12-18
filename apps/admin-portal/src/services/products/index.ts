import api from "../lib/api";
import Cookies from "js-cookie";
import { getSession } from "next-auth/react";

type ProductItem = {
  id: string;
  title: string;
  description?: string | null;
  price: number | string;
  stock_quantity: number;
  category_id: string;
  brand_id: string;
  currency: string;
  product_img_url?: string | null;
  sku?: string | null;
  is_active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  category?: any;
  brand?: any;
};

type ProductsListResponse = {
  status: boolean;
  statusCode: number;
  data: { products: ProductItem[]; pagination?: any };
};

type ProductItemResponse = {
  status: boolean;
  statusCode: number;
  data: ProductItem;
};

export type ProductsBulkUploadFailure = {
  rowNumber: number;
  reason: string;
};

export type ProductsBulkUploadResult = {
  totalRows: number;
  processedRows: number;
  createdCount: number;
  failedCount: number;
  failures: ProductsBulkUploadFailure[];
};

export type ProductsBulkUploadResponse = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: ProductsBulkUploadResult;
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

async function getAuthToken(): Promise<string | null> {
  if (typeof window !== "undefined") {
    try {
      const session = await getSession();
      if ((session as any)?.accessToken) {
        return String((session as any).accessToken);
      }
    } catch {
      // ignore
    }
  }

  const cookieToken = Cookies.get("access_token");
  if (cookieToken) return cookieToken;
  return null;
}

type ProductsBulkUploadState =
  | { status: "idle" }
  | {
      status: "uploading";
      startedAt: number;
      fileName: string;
    }
  | {
      status: "success";
      finishedAt: number;
      fileName: string;
      result: ProductsBulkUploadResult;
    }
  | {
      status: "error";
      finishedAt: number;
      fileName: string;
      error: string;
    };

const BULK_UPLOAD_LS_KEY = "productsBulkUploadState";

let productsBulkUploadState: ProductsBulkUploadState = { status: "idle" };
let productsBulkUploadPromise: Promise<ProductsBulkUploadResponse> | null = null;
const bulkUploadListeners = new Set<(s: ProductsBulkUploadState) => void>();

function persistBulkUploadState(s: ProductsBulkUploadState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BULK_UPLOAD_LS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

function hydrateBulkUploadState(): ProductsBulkUploadState {
  if (typeof window === "undefined") return { status: "idle" };
  try {
    const raw = window.localStorage.getItem(BULK_UPLOAD_LS_KEY);
    if (!raw) return { status: "idle" };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { status: "idle" };
    if (parsed.status === "uploading") {
      // If the app was reloaded, we can't actually resume the promise.
      // Keep showing loader until the user restarts the app flow.
      return parsed;
    }
    if (parsed.status === "success" || parsed.status === "error") {
      return parsed;
    }
    return { status: "idle" };
  } catch {
    return { status: "idle" };
  }
}

if (typeof window !== "undefined") {
  productsBulkUploadState = hydrateBulkUploadState();
}

function setProductsBulkUploadState(next: ProductsBulkUploadState) {
  productsBulkUploadState = next;
  persistBulkUploadState(next);
  for (const cb of bulkUploadListeners) cb(productsBulkUploadState);
}

export function getProductsBulkUploadState(): ProductsBulkUploadState {
  return productsBulkUploadState;
}

export function subscribeProductsBulkUpload(
  cb: (s: ProductsBulkUploadState) => void
): () => void {
  bulkUploadListeners.add(cb);
  cb(productsBulkUploadState);
  return () => bulkUploadListeners.delete(cb);
}

export function resetProductsBulkUploadState() {
  productsBulkUploadPromise = null;
  setProductsBulkUploadState({ status: "idle" });
}

export async function bulkUploadProductsExcel(
  file: File
): Promise<ProductsBulkUploadResponse> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const token = await getAuthToken();

  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${base}/products/bulk-upload`, {
    method: "POST",
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (json as any)?.message ||
      (json as any)?.error ||
      `Bulk upload failed (${res.status})`;
    throw new Error(String(msg));
  }

  return json as ProductsBulkUploadResponse;
}

export function startProductsBulkUploadExcel(
  file: File
): Promise<ProductsBulkUploadResponse> {
  if (productsBulkUploadState.status === "uploading" && productsBulkUploadPromise) {
    return productsBulkUploadPromise;
  }

  setProductsBulkUploadState({
    status: "uploading",
    startedAt: Date.now(),
    fileName: file.name,
  });

  productsBulkUploadPromise = bulkUploadProductsExcel(file)
    .then((resp) => {
      setProductsBulkUploadState({
        status: "success",
        finishedAt: Date.now(),
        fileName: file.name,
        result: resp.data,
      });
      return resp;
    })
    .catch((e: any) => {
      setProductsBulkUploadState({
        status: "error",
        finishedAt: Date.now(),
        fileName: file.name,
        error: String(e?.message ?? e),
      });
      throw e;
    })
    .finally(() => {
      // allow a future upload after completion
      productsBulkUploadPromise = null;
    });

  return productsBulkUploadPromise;
}

export async function listProducts(
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
    api.get<ProductsListResponse>("/products/getAll", {
      params,
      signal: opts?.signal,
    })
  );
  return { rows: data?.data?.products ?? [], pagination: data?.data?.pagination };
}

export async function getProductById(id: string) {
  const { data } = await with429Retry(() =>
    api.get<ProductItemResponse>(`/products/getById/${id}`)
  );
  return data.data;
}

export async function createProduct(payload: {
  title: string;
  description?: string;
  price: number;
  stock_quantity: number;
  category_id: string;
  brand_id: string;
  currency: string;
  product_img_url?: string | null;
  is_active?: boolean;
}) {
  try {
    const { data } = await with429Retry(() =>
      api.post<ProductItemResponse>("/products/create", payload)
    );
    return data.data;
  } catch (e: any) {
    const msg = String(e?.response?.data?.message ?? "");
    if (msg.toLowerCase().includes("is_active")) {
      const { is_active, ...rest } = payload;
      const { data } = await with429Retry(() =>
        api.post<ProductItemResponse>("/products/create", rest)
      );
      return data.data;
    }
    throw e;
  }
}

export async function updateProduct(payload: {
  id: string;
  title?: string;
  description?: string;
  price?: number;
  stock_quantity?: number;
  category_id?: string;
  brand_id?: string;
  currency?: string;
  product_img_url?: string | null;
  is_active?: boolean;
}) {
  try {
    const { data } = await with429Retry(() =>
      api.put<ProductItemResponse>("/products/update", payload)
    );
    return data.data;
  } catch (e: any) {
    const msg = String(e?.response?.data?.message ?? "");
    if (msg.toLowerCase().includes("is_active")) {
      const { is_active, ...rest } = payload;
      try {
        const { data } = await with429Retry(() =>
          api.put<ProductItemResponse>("/products/update", rest)
        );
        return data.data;
      } catch {
        const { data } = await with429Retry(() =>
          api.post<ProductItemResponse>("/products/update", rest)
        );
        return data.data;
      }
    }

    try {
      const { data } = await with429Retry(() =>
        api.post<ProductItemResponse>("/products/update", payload)
      );
      return data.data;
    } catch {
      throw e;
    }
  }
}

export async function deleteProduct(id: string) {
  const { data } = await with429Retry(() =>
    api.delete<ProductItemResponse>("/products/delete", { data: { id } })
  );
  return data.data;
}

export async function uploadProductImage(productId: string, file: File) {
  const form = new FormData();
  form.append("file", file);

  const token = await getAuthToken();
  const headers: HeadersInit | undefined = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const res = await fetch(`/api/v1/products/${productId}/image`, {
    method: "POST",
    body: form,
    headers,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.message;
    const error = (json as any)?.error;
    const msg =
      message && error
        ? `${message}: ${error}`
        : message || error || `Image upload failed (${res.status})`;
    throw new Error(msg);
  }

  const url = (json as any)?.url;
  const fileName = (json as any)?.fileName;

  if (!url || !fileName) {
    throw new Error("Invalid image upload response");
  }

  return { url: String(url), fileName: String(fileName) };
}

export async function deleteProductImage(fileName: string) {
  const token = await getAuthToken();
  const headers: HeadersInit | undefined = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const res = await fetch(
    `/api/v1/products/image/${encodeURIComponent(fileName)}`,
    { method: "DELETE", headers }
  );

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.message;
    const error = (json as any)?.error;
    const msg =
      message && error
        ? `${message}: ${error}`
        : message || error || `Image delete failed (${res.status})`;
    throw new Error(msg);
  }

  return json as any;
}
