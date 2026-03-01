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
  freight?: number;
  cost?: number;
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
  updatedCount?: number;
  failedCount: number;
  failures: ProductsBulkUploadFailure[];
  createdSkus?: string[];
  updatedSkus?: string[];
};

export type ProductsBulkUploadResponse = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: ProductsBulkUploadResult;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isCanceledError(e: any): boolean {
  return (
    e?.code === "ERR_CANCELED" ||
    e?.message === "canceled" ||
    e?.name === "CanceledError" ||
    e?.__CANCEL__ === true
  );
}

function parseRetryAfter(hdr?: string): number | null {
  if (!hdr) return null;
  const raw = String(hdr).trim();
  // Retry-After can be seconds or an HTTP-date.
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds);

  const asDate = new Date(raw);
  if (Number.isFinite(asDate.getTime())) {
    const diffMs = asDate.getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / 1000));
  }

  return null;
}

async function with429Retry<T>(
  fn: () => Promise<T>,
  {
    retries = 6,
    baseDelayMs = 1500,
    maxDelayMs = 30000,
  }: { retries?: number; baseDelayMs?: number; maxDelayMs?: number } = {}
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e: any) {
      // Important: if caller aborted (AbortController / route change / React strict mode),
      // do not retry.
      if (isCanceledError(e)) throw e;

      const status = e?.response?.status;
      const headers = e?.response?.headers as Record<string, any> | undefined;
      const retryAfterHdr = (headers?.["retry-after"] ?? headers?.["Retry-After"]) as
        | string
        | undefined;
      const retryAfterSec = parseRetryAfter(retryAfterHdr);
      const canRetry = status === 429 && attempt < retries;
      if (!canRetry) {
        if (status === 429) {
          throw new Error(
            "Too many requests (429). Please wait a few seconds and try again."
          );
        }
        throw e;
      }

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
  // Deduplicate in-flight list requests (Next dev / StrictMode can fire effects twice)
  // and avoid hammering the API which can trigger 429.
  const reqKey = JSON.stringify({ page, limit, search: search?.trim() || "" });
  if (inflightListProducts.has(reqKey)) {
    return inflightListProducts.get(reqKey)!;
  }

  const params = sanitize(
    { page, limit, search: search?.trim() || undefined },
    ["page", "limit", "search"]
  );

  const promise = (async () => {
    const { data } = await with429Retry(() =>
      api.get<ProductsListResponse>("/products/getAll", {
        params,
        signal: opts?.signal,
      })
    );
    return { rows: data?.data?.products ?? [], pagination: data?.data?.pagination };
  })().finally(() => {
    inflightListProducts.delete(reqKey);
  });

  inflightListProducts.set(reqKey, promise);
  return promise;
}

const inflightListProducts = new Map<
  string,
  Promise<{ rows: ProductItem[]; pagination?: any }>
>();

export async function getProductById(id: string) {
  const { data } = await with429Retry(() =>
    api.get<any>(`/products/getById/${id}`)
  );
  return data.data;
}

export async function createProduct(payload: {
  title: string;
  description?: string;
  price: number;
  stock_quantity: number;
  category_id: string;
  subcategory_id?: string | null;
  brand_id: string;
  currency: string;
  product_img_url?: string | null;
  product_video_url?: string | null;
  is_active?: boolean;
  discount?: number;
  start_discount_date?: string;
  end_discount_date?: string;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  tax_id?: string;
  supplier_id?: string;
  warehouse_id?: string;
  total_price?: number;
  variants?: { vtype_id: string; value: string; product_id?: string }[];
  customer_groups?: { cvg_ids: string[] };
  bulk_prices?: { quantity: number; price_per_product: number }[];
  freight?: number;
  cost?: number;
  imageUrls?: string[];
}) {
  try {
    const { data } = await with429Retry(() =>
      api.post<ProductItemResponse>("/products/create", payload)
    );
    return data.data;
  } catch (e: any) {
    // Only retry if it's a 400 error AND the message specifically mentions is_active field issue
    const status = e?.response?.status;
    const msg = String(e?.response?.data?.message ?? "");
    
    // Only retry if it's a bad request (400) and specifically about is_active field
    if (status === 400 && msg.toLowerCase().includes("is_active") && !msg.toLowerCase().includes("success")) {
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
  subcategory_id?: string | null;
  brand_id?: string;
  currency?: string;
  product_img_url?: string | null;
  product_video_url?: string | null;
  is_active?: boolean;
  discount?: number;
  start_discount_date?: string;
  end_discount_date?: string;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  tax_id?: string;
  supplier_id?: string;
  warehouse_id?: string;
  total_price?: number;
  variants?: { vtype_id: string; value: string; product_id?: string }[];
  customer_groups?: { cvg_ids: string[] };
  bulk_prices?: { quantity: number; price_per_product: number }[];
  freight?: number;
  cost?: number;
  image_urls?: string[];
}) {
  try {
    const { data } = await with429Retry(() =>
      api.put<ProductItemResponse>("/products/update", payload)
    );
    return data.data;
  } catch (e: any) {
    console.error("Update product error details:", {
      status: e?.response?.status,
      statusText: e?.response?.statusText,
      data: e?.response?.data,
      message: e?.response?.data?.message,
      error: e?.message,
      fullError: e,
      payload: payload
    });
    
    // Log the full error object to see its structure
    console.error("Full error object:", JSON.stringify(e, null, 2));
    
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
        api.put<ProductItemResponse>("/products/update", payload)
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

export async function uploadFeaturedImage(productId: string, file: File) {
  const form = new FormData();
  form.append("file", file);

  const token = await getAuthToken();
  const headers: HeadersInit | undefined = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const res = await fetch(`/api/v1/products/featured-image/${productId}`, {
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
        : message || error || `Featured image upload failed (${res.status})`;
    throw new Error(msg);
  }

  // Debug: Log the response structure
  console.log("Featured image upload response:", json);
  
  const url = (json as any)?.data?.url || (json as any)?.url;
  const fileName = (json as any)?.data?.fileName || (json as any)?.fileName;

  console.log("Extracted URL:", url, "Extracted fileName:", fileName);

  if (!url) {
    console.error("Invalid featured image upload response - full JSON:", json);
    throw new Error("Invalid featured image upload response");
  }

  return { url: String(url), fileName: fileName ? String(fileName) : file.name };
}

export type ZipGalleryUploadResponse = {
  uploaded: Array<{ fileName: string; url: string }>;
};

// Smaller chunks (10 MB) so each request finishes well under ~30–60s proxy/HTTP2 limits and avoids ERR_HTTP2_PROTOCOL_ERROR
const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB per chunk
const CHUNK_UPLOAD_MAX_RETRIES = 2;
const JOB_POLL_INTERVAL_MS = 2000;
const JOB_POLL_MAX_WAIT_MS = 60 * 60 * 1000; // 1 hour max wait for extraction

/**
 * Upload ZIP to zip-gallery. When NEXT_PUBLIC_FILE_BACKEND_URL is set, uses chunked upload
 * + background job (supports up to 5 GB on Railway's 5 min request limit). Otherwise uses proxy.
 */
export async function uploadZipGallery(file: File): Promise<ZipGalleryUploadResponse> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const filesBase = typeof process.env.NEXT_PUBLIC_FILE_BACKEND_URL === "string"
    ? process.env.NEXT_PUBLIC_FILE_BACKEND_URL.trim()
    : "";
  const base = filesBase ? filesBase.replace(/\/$/, "") : "";

  if (base) {
    if (!token?.trim()) {
      throw new Error("Login required for ZIP upload. Please sign in and try again.");
    }
    return uploadZipGalleryChunked(base, file, headers);
  }

  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/v1/zip-gallery/upload", {
    method: "POST",
    body: form,
    headers,
    credentials: "same-origin",
  });

  const text = await res.text();
  const lastLine = text.trim().split("\n").filter(Boolean).pop() || "{}";
  let json: { uploaded?: Array<{ fileName: string; url: string }>; error?: string; message?: string };
  try {
    json = JSON.parse(lastLine) as typeof json;
  } catch {
    json = {};
  }

  if (!res.ok) {
    const message = (json as { message?: string })?.message;
    const error = (json as { error?: string })?.error;
    const msg =
      message && error ? `${message}: ${error}` : message || error || `ZIP upload failed (${res.status})`;
    throw new Error(String(msg));
  }

  if ((json as { error?: string }).error) {
    throw new Error(String((json as { error?: string }).error));
  }

  return (json?.uploaded != null ? { uploaded: json.uploaded } : json) as ZipGalleryUploadResponse;
}

async function uploadZipGalleryChunked(
  base: string,
  file: File,
  headers: HeadersInit,
): Promise<ZipGalleryUploadResponse> {
  let currentHeaders = headers;

  const ensureAuthHeaders = async (): Promise<HeadersInit> => {
    const token = await getAuthToken();
    if (!token?.trim()) return currentHeaders;
    return { ...currentHeaders, Authorization: `Bearer ${token}` };
  };

  const initRes = await fetch(`${base}/v1/zip-gallery/upload/init`, {
    method: "POST",
    headers: { ...currentHeaders, "Content-Type": "application/json" },
    credentials: "include",
  });
  if (initRes.status === 401) {
    currentHeaders = await ensureAuthHeaders();
    const retryInit = await fetch(`${base}/v1/zip-gallery/upload/init`, {
      method: "POST",
      headers: { ...currentHeaders, "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!retryInit.ok) {
      const err = await retryInit.json().catch(() => ({}));
      throw new Error(
        (err as { message?: string }).message || "File server rejected login. Ensure JWT_SECRET matches the admin backend."
      );
    }
    const retryJson = (await retryInit.json()) as { uploadId: string };
    if (!retryJson.uploadId) throw new Error("No uploadId returned");
    return uploadZipGalleryChunkedWithUploadId(base, file, retryJson.uploadId, currentHeaders);
  }
  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || `Init failed (${initRes.status})`);
  }
  const { uploadId } = (await initRes.json()) as { uploadId: string };
  if (!uploadId) throw new Error("No uploadId returned");

  return uploadZipGalleryChunkedWithUploadId(base, file, uploadId, currentHeaders);
}

async function uploadZipGalleryChunkedWithUploadId(
  base: string,
  file: File,
  uploadId: string,
  headers: HeadersInit,
): Promise<ZipGalleryUploadResponse> {
  let currentHeaders = headers;

  const ensureAuthHeaders = async (): Promise<HeadersInit> => {
    const token = await getAuthToken();
    if (!token?.trim()) return currentHeaders;
    return { ...currentHeaders, Authorization: `Bearer ${token}` };
  };

  let offset = 0;
  let part = 0;
  while (offset < file.size) {
    const chunk = file.slice(offset, Math.min(offset + CHUNK_SIZE, file.size));
    const form = new FormData();
    form.append("uploadId", uploadId);
    form.append("part", String(part));
    form.append("chunk", chunk, "chunk");

    let lastErr: Error | null = null;
    let didRetryAuth = false;
    for (let attempt = 0; attempt <= CHUNK_UPLOAD_MAX_RETRIES; attempt++) {
      try {
        const chunkRes = await fetch(`${base}/v1/zip-gallery/upload/chunk`, {
          method: "POST",
          body: form,
          headers: currentHeaders,
          credentials: "include",
        });
        if (chunkRes.status === 401 && !didRetryAuth) {
          didRetryAuth = true;
          currentHeaders = await ensureAuthHeaders();
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }
        if (!chunkRes.ok) {
          const err = await chunkRes.json().catch(() => ({}));
          const msg = (err as { message?: string }).message || `Chunk ${part} failed (${chunkRes.status})`;
          if (chunkRes.status === 401) {
            throw new Error("File server rejected login. Set JWT_SECRET on the file backend to match the admin backend.");
          }
          throw new Error(msg);
        }
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        const msg = lastErr.message || "";
        const isNetworkOrProtocol =
          msg.includes("HTTP2") ||
          msg.includes("ERR_") ||
          msg.includes("Failed to fetch") ||
          msg.includes("NetworkError") ||
          lastErr.name === "TypeError";
        if (attempt < CHUNK_UPLOAD_MAX_RETRIES && isNetworkOrProtocol) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw lastErr;
      }
    }
    if (lastErr) throw lastErr;

    offset += chunk.size;
    part += 1;
  }

  const completeRes = await fetch(`${base}/v1/zip-gallery/upload/complete`, {
    method: "POST",
    headers: { ...currentHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ uploadId }),
    credentials: "include",
  });
  if (!completeRes.ok) {
    const err = await completeRes.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || `Complete failed (${completeRes.status})`);
  }
  const { jobId } = (await completeRes.json()) as { jobId: string };
  if (!jobId) throw new Error("No jobId returned");

  const started = Date.now();
  while (Date.now() - started < JOB_POLL_MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, JOB_POLL_INTERVAL_MS));
    const jobRes = await fetch(`${base}/v1/zip-gallery/jobs/${jobId}`, {
      headers: currentHeaders,
      credentials: "include",
    });
    if (!jobRes.ok) throw new Error(`Job status failed (${jobRes.status})`);
    const job = (await jobRes.json()) as {
      status: string;
      uploaded?: Array<{ fileName: string; url: string }>;
      error?: string;
    };
    if (job.status === "completed" && job.uploaded) {
      return { uploaded: job.uploaded };
    }
    if (job.status === "failed") {
      throw new Error(job.error || "Extraction failed");
    }
  }

  throw new Error("Extraction timed out; try again or use a smaller ZIP.");
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

export async function deleteProductImageById(productId: string, imageId: string) {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const token = await getAuthToken();
  const headers: HeadersInit | undefined = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const res = await fetch(
    `${base}/products/images/${productId}/${imageId}`,
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

// Image upload for multiple files (max 10)
export async function uploadProductImages(productId: string, files: File[]) {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  // Validate files
  const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxFileSize = 5 * 1024 * 1024; // 5MB
  const maxFiles = 10;

  if (files.length > maxFiles) {
    throw new Error(`Maximum ${maxFiles} images allowed`);
  }

  for (const file of files) {
    if (!allowedImageTypes.includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}. Only JPEG, PNG, and WebP images are allowed`);
    }
    if (file.size > maxFileSize) {
      throw new Error(`File ${file.name} is too large. Maximum size is 5MB`);
    }
  }

  const token = await getAuthToken();
  const headers: HeadersInit | undefined = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const form = new FormData();
  files.forEach((file) => {
    form.append("files", file);
  });

  const res = await fetch(`${base}/products/images/${productId}`, {
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

  return json as any;
}

// Video upload for single file
export async function uploadProductVideo(productId: string, file: File) {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  // Validate video file
  const allowedVideoTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
  const maxVideoSize = 50 * 1024 * 1024; // 50MB

  if (!allowedVideoTypes.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Only MP4, WebM, OGG, and QuickTime videos are allowed`);
  }
  if (file.size > maxVideoSize) {
    throw new Error(`Video file is too large. Maximum size is 50MB`);
  }

  const token = await getAuthToken();
  const headers: HeadersInit | undefined = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${base}/products/video/${productId}`, {
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
        : message || error || `Video upload failed (${res.status})`;
    throw new Error(msg);
  }

  // Debug: Log the response structure
  console.log("Video upload response:", json);
  
  const url = (json as any)?.data?.url || (json as any)?.url;
  const fileName = (json as any)?.data?.fileName || (json as any)?.fileName;

  console.log("Extracted video URL:", url, "Extracted fileName:", fileName);

  if (!url) {
    console.error("Invalid video upload response - full JSON:", json);
    throw new Error("Invalid video upload response");
  }

  return { url: String(url), fileName: fileName ? String(fileName) : file.name };
}

// Create custom variant type for a specific product
export async function createCustomVariantType(productId: string, name: string) {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const token = await getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${base}/products/${productId}/custom-variant-types`, {
    method: "POST",
    body: JSON.stringify({ name }),
    headers,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.message;
    const error = (json as any)?.error;
    const msg =
      message && error
        ? `${message}: ${error}`
        : message || error || `Create custom variant type failed (${res.status})`;
    throw new Error(msg);
  }

  return json as any;
}

// Unlink/delete custom variant type from a specific product
export async function unlinkCustomVariantType(productId: string, vtypeId: string) {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const token = await getAuthToken();
  const headers: HeadersInit | undefined = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const res = await fetch(`${base}/products/${productId}/custom-variant-types/${vtypeId}`, {
    method: "DELETE",
    headers,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.message;
    const error = (json as any)?.error;
    const msg =
      message && error
        ? `${message}: ${error}`
        : message || error || `Unlink custom variant type failed (${res.status})`;
    throw new Error(msg);
  }

  return json as any;
}

// Get default variant types (size, model, year)
export async function getDefaultVariantTypes() {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const token = await getAuthToken();
  const headers: HeadersInit | undefined = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const res = await fetch(`${base}/products/getAll?variantTypes=true`, {
    method: "GET",
    headers,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.message;
    const error = (json as any)?.error;
    const msg =
      message && error
        ? `${message}: ${error}`
        : message || error || `Get default variant types failed (${res.status})`;
    throw new Error(msg);
  }

  return json as any;
}
