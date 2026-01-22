import api from "../lib/api";

import { getSession } from "next-auth/react";
import Cookies from "js-cookie";

type BlogItem = {
  id: string;
  heading: string;
  paragraph: string;
  blog_img?: string;
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
};

type BlogsListResponse = {
  success: boolean;
  message: string;
  data: BlogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type BlogItemResponse = {
  success: boolean;
  message: string;
  data: BlogItem;
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
      const session: any = await getSession();
      if (session?.accessToken) {
        return String(session.accessToken);
      }
      if (session?.user?.accessToken) {
        return String(session.user.accessToken);
      }
    } catch {
      return null;
    }
  }

  const cookieToken = Cookies.get("access_token");
  if (cookieToken) return cookieToken;
  return null;
}

export async function listBlogs(
  page = 1,
  limit = 10,
  search?: string,
  is_active?: boolean,
  opts?: { signal?: AbortSignal }
) {
  const params = sanitize(
    { 
      page, 
      limit, 
      search: search?.trim() || undefined,
      is_active: is_active !== undefined ? is_active : undefined,
    },
    ["page", "limit", "search", "is_active"]
  );
  const { data } = await with429Retry(() =>
    api.get<BlogsListResponse>("/blogs/getAll", {
      params,
      signal: opts?.signal,
    })
  );
  
  return { 
    rows: data?.data ?? [], 
    pagination: data?.pagination ?? {
      page: page,
      limit: limit,
      total: 0,
      totalPages: 1,
    }
  };
}

export async function getBlogById(id: string) {
  const { data } = await with429Retry(() =>
    api.get<BlogItemResponse>(`/blogs/getById/${id}`)
  );
  return data.data;
}

export async function createBlog(payload: {
  heading: string;
  paragraph: string;
  blog_img?: string;
  is_active?: boolean;
}) {
  const body = sanitize(
    {
      heading: payload.heading?.trim(),
      paragraph: payload.paragraph?.trim(),
      blog_img: payload.blog_img?.trim(),
      is_active: payload.is_active,
    },
    ["heading", "paragraph", "blog_img", "is_active"]
  );

  const { data } = await with429Retry(() =>
    api.post<BlogItemResponse>("/blogs/create", body)
  );
  return data.data;
}

export async function updateBlog(payload: {
  id: string;
  heading?: string;
  paragraph?: string;
  blog_img?: string;
  is_active?: boolean;
}) {
  const { id, ...rest } = payload;
  const body = sanitize(
    {
      heading: rest.heading?.trim(),
      paragraph: rest.paragraph?.trim(),
      blog_img: rest.blog_img?.trim(),
      is_active: rest.is_active,
    },
    ["heading", "paragraph", "blog_img", "is_active"]
  );

  const { data } = await with429Retry(() =>
    api.put<BlogItemResponse>(`/blogs/update/${id}`, body)
  );
  return data.data;
}

export async function toggleBlogActive(id: string) {
  const { data } = await with429Retry(() =>
    api.put<BlogItemResponse>(`/blogs/toggle-active/${id}`, {})
  );
  return data.data;
}

type DeleteResponse = {
  success: boolean;
  message: string;
};

export async function deleteBlog(id: string) {
  const { data } = await with429Retry(() =>
    api.delete<DeleteResponse>(`/blogs/delete/${id}`)
  );
  return data;
}

export async function uploadBlogImage(file: File) {
  const form = new FormData();
  form.append("file", file);

  const token = await getAuthToken();
  const headers: HeadersInit | undefined = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const res = await fetch(`/api/v1/blogs/image`, {
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

  const url = (json as any)?.data?.url || (json as any)?.url;
  const fileName = (json as any)?.data?.fileName || (json as any)?.fileName;

  if (!url || !fileName) {
    throw new Error("Invalid image upload response");
  }

  return { url: String(url), fileName: String(fileName) };
}
