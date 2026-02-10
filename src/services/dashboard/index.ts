import api from "../lib/api";

export type DashboardDelta = {
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number;
};

export interface DashboardOverview {
  period: {
    current: { from: string; to: string };
    previous: { from: string; to: string };
  };
  cards: {
    salesUpPercent: number;
    revenue: DashboardDelta;
    orders: DashboardDelta;
    newCustomers: DashboardDelta;
    newProducts: DashboardDelta;
  };
  charts: {
    revenueOverview: Array<{ day: string; revenue: number; orders: number }>;
    salesByCategory: Array<{
      categoryId: string;
      categoryName: string;
      revenue: number;
      quantity: number;
    }>;
    topProducts: Array<{
      productId: string;
      productName: string;
      quantity: number;
      revenue: number;
    }>;
    orderStatusTrends: Array<{
      day: string;
      pending: number;
      accepted: number;
      rejected: number;
    }>;
  };
}

export const getDashboardOverview = async (): Promise<DashboardOverview> => {
  const response = await api.get("/dashboard/getOverview");
  return response.data.data as DashboardOverview;
};
