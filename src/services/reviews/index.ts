import api from "@/services/lib/api";

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  comment: string;
  status: "pending" | "approved" | "rejected";
  is_verified_purchase: boolean;
  admin_notes: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  product: {
    id: string;
    title: string;
    sku: string;
  };
  customer: {
    id: string;
    fullname: string;
    email: string;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ReviewsListResponse {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: {
    reviews: Review[];
    pagination: Pagination;
  };
}

export interface ReviewResponse {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: Review;
}

export interface GetReviewsParams {
  page?: number;
  limit?: number;
  status?: "pending" | "approved" | "rejected";
  product_id?: string;
  user_id?: string;
  rating?: number;
  is_verified_purchase?: boolean;
  search?: string;
  sortBy?: "created_at" | "updated_at" | "rating" | "status" | "reviewed_at";
  sortOrder?: "ASC" | "DESC";
}

export interface ApproveReviewData {
  status: "approved" | "rejected";
  rejection_reason?: string;
}

export const reviewsApi = {
  getAll: async (params?: GetReviewsParams): Promise<ReviewsListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.status) searchParams.append("status", params.status);
    if (params?.product_id) searchParams.append("product_id", params.product_id);
    if (params?.user_id) searchParams.append("user_id", params.user_id);
    if (params?.rating) searchParams.append("rating", params.rating.toString());
    if (params?.is_verified_purchase !== undefined) searchParams.append("is_verified_purchase", params.is_verified_purchase.toString());
    if (params?.search) searchParams.append("search", params.search);
    if (params?.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.append("sortOrder", params.sortOrder);

    const url = `/reviews/getAll${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const response = await api.get(url);
    return response.data;
  },

  getById: async (id: string): Promise<ReviewResponse> => {
    const response = await api.get(`/reviews/getById/${id}`);
    return response.data;
  },

  approve: async (id: string, data: ApproveReviewData): Promise<ReviewResponse> => {
    const response = await api.post(`/reviews/approve/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ReviewResponse> => {
    const response = await api.delete(`/reviews/delete/${id}`);
    return response.data;
  },
};
