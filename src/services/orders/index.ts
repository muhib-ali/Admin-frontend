import api from "@/services/lib/api";

export interface OrderItem {
  id: string;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  requested_price_per_unit?: string;
  offered_price_per_unit?: string;
  bulk_min_quantity?: number;
  item_status?: "pending" | "accepted" | "rejected";
}

export interface Order {
  id: string;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  order_number: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  subtotal_amount: string;
  discount_amount: string;
  total_amount: string;
  promo_code_id: string | null;
  status: "pending" | "accepted" | "rejected" | "partially_accepted";
  order_type?: "regular" | "bulk";
  notes: string;
  order_items: OrderItem[];
  user?: {
    id: string;
    first_name: string;
    last_name: string;
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
  nextPage: number | null;
  prevPage: number | null;
}

export interface OrdersListResponse {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: {
    orders: Order[];
    pagination: Pagination;
  };
}

export interface OrderResponse {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: Order;
}

export interface GetOrdersParams {
  page?: number;
  limit?: number;
  status?: "pending" | "accepted" | "rejected" | "partially_accepted";
  search?: string;
  order_type?: "regular" | "bulk" | "all";
}

export const ordersApi = {
  getAll: async (params?: GetOrdersParams): Promise<OrdersListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.status) searchParams.append("status", params.status);
    if (params?.search) searchParams.append("search", params.search);
    if (params?.order_type) searchParams.append("order_type", params.order_type);

    const url = `/orders/getAll${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const response = await api.get(url);
    return response.data;
  },

  getById: async (id: string): Promise<OrderResponse> => {
    const response = await api.get(`/orders/getById/${id}`);
    return response.data;
  },

  accept: async (id: string): Promise<OrderResponse> => {
    const response = await api.patch(`/orders/accept/${id}`);
    return response.data;
  },

  reject: async (id: string): Promise<OrderResponse> => {
    const response = await api.patch(`/orders/reject/${id}`);
    return response.data;
  },
};

export interface BulkOrdersListResponse {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: {
    orders: Order[];
    pagination: Pagination;
  };
}

export interface GetBulkOrdersParams {
  page?: number;
  limit?: number;
  status?: "pending" | "accepted" | "rejected" | "partially_accepted";
  search?: string;
}

export const bulkOrdersApi = {
  getAll: async (params?: GetBulkOrdersParams): Promise<BulkOrdersListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.status) searchParams.append("status", params.status);
    if (params?.search) searchParams.append("search", params.search);

    const url = `/bulk-orders/getAll${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const response = await api.get(url);

    const payload = response.data as any;
    const orders = payload?.data?.orders ?? payload?.data?.["bulk-orders"] ?? [];
    const pagination = payload?.data?.pagination ?? null;

    return {
      ...payload,
      data: {
        orders,
        pagination,
      },
    } as BulkOrdersListResponse;
  },

  getById: async (id: string): Promise<OrderResponse> => {
    const response = await api.get(`/bulk-orders/getById/${id}`);
    return response.data;
  },

  acceptItem: async (orderId: string, orderItemId: string): Promise<OrderResponse> => {
    const response = await api.patch(`/bulk-orders/${orderId}/items/${orderItemId}/accept`);
    return response.data;
  },

  rejectItem: async (orderId: string, orderItemId: string): Promise<OrderResponse> => {
    const response = await api.patch(`/bulk-orders/${orderId}/items/${orderItemId}/reject`);
    return response.data;
  },
};