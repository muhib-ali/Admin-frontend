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

type TaxesDropdownData = {
  taxesDropdown: DropdownItem[];
};

type SuppliersDropdownData = {
  suppliersDropdown: DropdownItem[];
};

type WarehousesDropdownData = {
  warehousesDropdown: DropdownItem[];
};

type VariantTypesDropdownData = {
  variantTypesDropdown: DropdownItem[];
};

type CustomerVisibilityGroupsDropdownData = {
  customerVisibilityGroupsDropdown: DropdownItem[];
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
      // If the request was aborted/canceled (AbortController / route change / React strict mode),
      // do not retry.
      if (isCanceledError(e)) throw e;

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

export async function getAllTaxesDropdown(opts?: { signal?: AbortSignal }) {
  const { data } = await with429Retry(() =>
    api.get<DropdownsResponse<TaxesDropdownData>>(
      "/dropdowns/getAllTaxes",
      {
        signal: opts?.signal,
      }
    )
  );
  return data?.data?.taxesDropdown ?? [];
}

export async function getAllSuppliersDropdown(opts?: { signal?: AbortSignal }) {
  const { data } = await with429Retry(() =>
    api.get<DropdownsResponse<SuppliersDropdownData>>(
      "/dropdowns/getAllSuppliers",
      {
        signal: opts?.signal,
      }
    )
  );
  return data?.data?.suppliersDropdown ?? [];
}

export async function getAllWarehousesDropdown(opts?: { signal?: AbortSignal }) {
  const { data } = await with429Retry(() =>
    api.get<DropdownsResponse<WarehousesDropdownData>>(
      "/dropdowns/getAllWarehouses",
      {
        signal: opts?.signal,
      }
    )
  );
  return data?.data?.warehousesDropdown ?? [];
}

export async function getAllVariantTypesDropdown(opts?: { signal?: AbortSignal }) {
  const { data } = await with429Retry(() =>
    api.get<DropdownsResponse<VariantTypesDropdownData>>(
      "/dropdowns/getAllVariantTypes",
      {
        signal: opts?.signal,
      }
    )
  );
  return data?.data?.variantTypesDropdown ?? [];
}

export async function getAllCustomerVisibilityGroupsDropdown(opts?: { signal?: AbortSignal }) {
  const { data } = await with429Retry(() =>
    api.get<DropdownsResponse<CustomerVisibilityGroupsDropdownData>>(
      "/dropdowns/getAllCustomerVisibilityGroups",
      {
        signal: opts?.signal,
      }
    )
  );
  return data?.data?.customerVisibilityGroupsDropdown ?? [];
}
