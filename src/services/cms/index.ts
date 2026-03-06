import api from "../lib/api";
import { getSession } from "next-auth/react";
import Cookies from "js-cookie";

export type CmsSubSectionRow = {
  id: string;
  section_key: string;
  subsection_key: string | null;
  label: string | null;
  title: string | null;
  description: string | null;
  section_img_url: string | null;
  sort_order: number;
};

export type CmsSectionRow = {
  id: string;
  section_key: string;
  subsection_key: string | null;
  label: string | null;
  title: string | null;
  description: string | null;
  section_img_url: string | null;
  sort_order: number;
  subsections?: CmsSubSectionRow[];
  subsections_count?: number;
};

type CmsListResponse = {
  success: boolean;
  message: string;
  data: CmsSectionRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type CmsOneResponse = {
  success: boolean;
  message: string;
  data: CmsSectionRow;
};

type CmsCreateUpdateResponse = {
  success: boolean;
  message: string;
  data: CmsSectionRow;
};

async function getAuthToken(): Promise<string | null> {
  if (typeof window !== "undefined") {
    try {
      const session: any = await getSession();
      if (session?.accessToken) return String(session.accessToken);
      if (session?.user?.accessToken) return String(session.user.accessToken);
    } catch {
      return null;
    }
  }
  const cookieToken = Cookies.get("access_token");
  return cookieToken ?? null;
}

export async function listCmsSections(
  page = 1,
  limit = 10,
  search?: string,
  opts?: { signal?: AbortSignal }
) {
  const params: Record<string, string | number | undefined> = {
    page,
    limit,
    sort_by: "sort_order",
    order: "ASC",
  };
  if (search?.trim()) params.search = search.trim();

  const { data } = await api.get<CmsListResponse>("/cms/getAll", {
    params,
    signal: opts?.signal,
  });

  return {
    rows: data?.data ?? [],
    pagination: data?.pagination ?? {
      page,
      limit,
      total: 0,
      totalPages: 0,
    },
  };
}

export async function getCmsSectionById(id: string) {
  const { data } = await api.get<CmsOneResponse>(`/cms/getById/${id}`);
  return data.data;
}

export async function createCmsSection(payload: {
  section_key: string;
  label?: string;
  title?: string;
  description?: string;
  section_img_url?: string;
  subsections?: Array<{
    subsection_key?: string;
    label?: string;
    title?: string;
    description?: string;
    section_img_url?: string;
    sort_order?: number;
  }>;
}) {
  const body = {
    section_key: payload.section_key.trim(),
    label: payload.label?.trim() || undefined,
    title: payload.title?.trim() || undefined,
    description: payload.description?.trim() || undefined,
    section_img_url: payload.section_img_url?.trim() || undefined,
    subsections: payload.subsections?.map((s, i) => ({
      subsection_key: s.subsection_key?.trim() || `sub_${i + 1}`,
      label: s.label?.trim() || undefined,
      title: s.title?.trim() || undefined,
      description: s.description?.trim() || undefined,
      section_img_url: s.section_img_url?.trim() || undefined,
      sort_order: s.sort_order ?? i + 1,
    })),
  };

  const { data } = await api.post<CmsCreateUpdateResponse>("/cms/create", body);
  return data.data;
}

export async function updateCmsSection(
  id: string,
  payload: {
    section_key?: string;
    label?: string;
    title?: string;
    description?: string;
    section_img_url?: string;
    subsections?: Array<{
      subsection_key?: string;
      label?: string;
      title?: string;
      description?: string;
      section_img_url?: string;
      sort_order?: number;
    }>;
  }
) {
  const body = {
    section_key: payload.section_key?.trim(),
    label: payload.label?.trim(),
    title: payload.title?.trim(),
    description: payload.description?.trim(),
    section_img_url: payload.section_img_url?.trim(),
    subsections: payload.subsections?.map((s, i) => ({
      subsection_key: s.subsection_key?.trim() || `sub_${i + 1}`,
      label: s.label?.trim(),
      title: s.title?.trim(),
      description: s.description?.trim(),
      section_img_url: s.section_img_url?.trim(),
      sort_order: s.sort_order ?? i + 1,
    })),
  };

  const { data } = await api.put<CmsCreateUpdateResponse>(
    `/cms/update/${id}`,
    body
  );
  return data.data;
}

export async function deleteCmsSection(id: string) {
  await api.delete(`/cms/delete/${id}`);
}

export async function uploadCmsImage(file: File): Promise<{ url: string; fileName: string }> {
  const form = new FormData();
  form.append("file", file);

  const token = await getAuthToken();
  const headers: HeadersInit | undefined = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const res = await fetch("/api/v1/cms", {
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

  const url = (json as any)?.data?.url ?? (json as any)?.url;
  const fileName = (json as any)?.data?.fileName ?? (json as any)?.fileName;

  if (!url || !fileName) {
    throw new Error("Invalid image upload response");
  }

  return { url: String(url), fileName: String(fileName) };
}
