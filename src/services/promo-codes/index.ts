import { AxiosInstance } from "axios";

type ApiResponse<T = any> = {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: T;
};

export interface PromoCode {
  id: string;
  code: string;
  value: number;
  usage_limit: number;
  usage_count: number;
  expires_at: string;
  is_active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromoCodesListResponse {
  promoCodes: PromoCode[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
}

export interface CreatePromoCodeDto {
  code: string;
  value: number;
  usageLimit: number;
  expiresAt: string;
  isActive: boolean;
}

export interface UpdatePromoCodeDto extends CreatePromoCodeDto {
  id: string;
}

export interface DeletePromoCodeDto {
  id: string;
}

// Helper to detect canceled requests
function isCanceled(e: any): boolean {
  return (
    e?.message === "canceled" ||
    e?.name === "CanceledError" ||
    e?.__CANCEL__ === true
  );
}

// Parse Retry-After header (seconds or HTTP-date)
function parseRetryAfter(hdr?: string): number | null {
  if (!hdr) return null;
  const raw = String(hdr).trim();
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds);
  const asDate = new Date(raw);
  if (Number.isFinite(asDate.getTime())) {
    const diffMs = asDate.getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / 1000));
  }
  return null;
}

// Retry config with exponential backoff and Retry-After header support
const defaultRetryConfig = {
  retries: 3,
  retryDelay: (retryCount: number, error: any) => {
    if (isCanceled(error)) return 0;
    const retryAfter = parseRetryAfter(error?.response?.headers?.["retry-after"]);
    if (retryAfter !== null) return retryAfter * 1000;
    return Math.min(1000 * 2 ** retryCount, 30000);
  },
  retryCondition: (error: any) => {
    if (isCanceled(error)) return false;
    const status = error?.response?.status;
    return status === 429 || (status >= 500 && status < 600);
  },
};

export class PromoCodesService {
  constructor(private api: AxiosInstance) {}

  private async request<T>(config: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.api({ ...defaultRetryConfig, ...config });
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 429) {
        const retryAfter = parseRetryAfter(error?.response?.headers?.["retry-after"]);
        const waitMsg = retryAfter !== null ? ` Retry after ${retryAfter}s.` : "";
        throw new Error(`Too many requests.${waitMsg}`);
      }
      throw error;
    }
  }

  async createPromoCode(data: CreatePromoCodeDto): Promise<ApiResponse<PromoCode>> {
    return this.request<PromoCode>({
      method: "post",
      url: "/promo-codes/create",
      data,
    });
  }

  async getAllPromoCodes(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ApiResponse<PromoCodesListResponse>> {
    return this.request<PromoCodesListResponse>({
      method: "get",
      url: "/promo-codes/getAll",
      params,
    });
  }

  async getPromoCodeById(id: string): Promise<ApiResponse<PromoCode>> {
    return this.request<PromoCode>({
      method: "get",
      url: `/promo-codes/getById/${id}`,
    });
  }

  async updatePromoCode(data: UpdatePromoCodeDto): Promise<ApiResponse<PromoCode>> {
    return this.request<PromoCode>({
      method: "put",
      url: "/promo-codes/update",
      data,
    });
  }

  async deletePromoCode(data: DeletePromoCodeDto): Promise<ApiResponse<null>> {
    return this.request<null>({
      method: "delete",
      url: "/promo-codes/delete",
      data,
    });
  }
}

let promoCodesServiceInstance: PromoCodesService | null = null;

export function usePromoCodesService(api: AxiosInstance): PromoCodesService {
  if (!promoCodesServiceInstance) {
    promoCodesServiceInstance = new PromoCodesService(api);
  }
  return promoCodesServiceInstance;
}