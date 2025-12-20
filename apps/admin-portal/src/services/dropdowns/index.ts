import api from "../lib/api";

type DropdownItem = {
  label: string;
  value: string;
};

type DropdownsResponse<TData> = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: TData;
};

type BrandsDropdownData = {
  brandsDropdown: DropdownItem[];
};

type CategoriesDropdownData = {
  categoriesDropdown: DropdownItem[];
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

export async function getAllBrandsDropdown(opts?: { signal?: AbortSignal }) {
  const { data } = await with429Retry(() =>
    api.get<DropdownsResponse<BrandsDropdownData>>("/dropdowns/getAllBrands", {
      signal: opts?.signal,
    })
  );
  return data?.data?.brandsDropdown ?? [];
}

export async function getAllCategoriesDropdown(opts?: { signal?: AbortSignal }) {
  const { data } = await with429Retry(() =>
    api.get<DropdownsResponse<CategoriesDropdownData>>(
      "/dropdowns/getAllCategories",
      {
        signal: opts?.signal,
      }
    )
  );
  return data?.data?.categoriesDropdown ?? [];
}
