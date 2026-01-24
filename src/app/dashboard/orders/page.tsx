"use client";

import * as React from "react";
import { Search, ChevronLeft, ChevronRight, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PermissionBoundary from "@/components/permission-boundary";
import { notifyError, notifySuccess } from "@/utils/notify";
import { ordersApi, Order, Pagination } from "@/services/orders";
import { useCurrency } from "@/contexts/currency-context";
import { useHasPermission } from "@/hooks/use-permission";

type OrderStatus = "pending" | "accepted" | "rejected" | "partially_accepted";

type OrderRow = {
  orderId: string;
  orderNumber: string;
  customer: string;
  items: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  convertedTotal?: number;
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, string> = {
    pending: "bg-amber-500/10 text-amber-700",
    accepted: "bg-emerald-500/10 text-emerald-700",
    rejected: "bg-rose-500/10 text-rose-700",
    partially_accepted: "bg-blue-500/10 text-blue-700",
  };
  return (
    <Badge variant="secondary" className={map[status]}>
      {status === "partially_accepted" ? "Partially Accepted" : status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function OrdersPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [pagination, setPagination] = React.useState<Pagination | null>(null);
  const [loading, setLoading] = React.useState(false);
  
  // Permission checks
  const canAcceptOrder = useHasPermission("orders/accept");
  const canRejectOrder = useHasPermission("orders/reject");
  
  // Use existing currency context from topbar
  const { getCurrencyCode, convertAmount, getCurrencySymbol } = useCurrency();
  const targetCurrency = getCurrencyCode();

  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"All" | OrderStatus>(
    "All"
  );
  const [page, setPage] = React.useState(1);
  const limit = 5;

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQuery, statusFilter, targetCurrency]);

  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (statusFilter !== "All") {
        params.status = statusFilter;
      }
      if (debouncedQuery) {
        params.search = debouncedQuery;
      }
      const response = await ordersApi.getAll(params);
      if (response.status && response.data?.orders) {
        const transformedOrders = await Promise.all(
          response.data.orders.map(async (order: Order) => {
            const total = parseFloat(order.total_amount);
            let convertedTotal: number | undefined;
            
            try {
              convertedTotal = await convertAmount(total, 'USD', targetCurrency);
            } catch (error) {
              console.warn('Currency conversion failed:', error);
            }

            return {
              orderId: order.id,
              orderNumber: order.order_number,
              customer: `${order.first_name} ${order.last_name}`,
              items: (order.order_items ?? []).reduce(
                (sum, item) => sum + (item.quantity || 0),
                0
              ),
              total,
              status: order.status,
              createdAt: order.created_at,
              convertedTotal,
            };
          })
        );
        setOrders(transformedOrders);
        setPagination(response.data.pagination);
      } else {
        setOrders([]);
        setPagination(null);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      notifyError("Failed to fetch orders");
      setOrders([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, debouncedQuery, targetCurrency, convertAmount]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);


  const acceptOrder = async (id: string) => {
    try {
      const response = await ordersApi.accept(id);
      
      if (response.status) {
        notifySuccess("Order accepted successfully");
        fetchOrders();
      }
    } catch (error) {
      console.error("Failed to accept order:", error);
      notifyError("Failed to accept order");
    }
  };

  const rejectOrder = async (id: string) => {
    try {
      const response = await ordersApi.reject(id);
      
      if (response.status) {
        notifySuccess("Order rejected successfully");
        fetchOrders();
      }
    } catch (error) {
      console.error("Failed to reject order:", error);
      notifyError("Failed to reject order");
    }
  };

  const total = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 1;
  const pagPage = Math.min(page, totalPages);
  const pagStart = total === 0 ? 0 : (pagPage - 1) * limit + 1;
  const pagEnd = total === 0 ? 0 : Math.min(pagPage * limit, total);

  const rows = React.useMemo(() => {
    return orders;
  }, [orders]);

  const renderCreatedAt = (iso: string) => {
    if (!mounted) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };



  return (
    <PermissionBoundary screen="/dashboard/orders" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage customer orders
            </p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-xl sm:text-2xl">All Orders</CardTitle>

              <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-center">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as any)}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative w-full sm:w-[260px] md:w-[320px] lg:w-[350px] max-w-full">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 pl-9 w-full"
                    placeholder="Search orders..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-6">
            <div className="mt-1 rounded-xl border overflow-hidden overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow className="bg-gray-200">
                    <TableHead className="rounded-tl-xl">Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right rounded-tr-xl">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="p-8 text-center text-muted-foreground"
                      >
                        Loading orders...
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No orders found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((o, idx) => {
                      const isLast = idx === rows.length - 1;
                      return (
                        <TableRow
                          key={o.orderId}
                          className="odd:bg-muted/30 even:bg-white hover:bg-transparent"
                        >
                          <TableCell className={isLast ? "rounded-bl-xl" : ""}>
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-md bg-muted">
                                <Truck className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="font-medium truncate">{o.orderNumber}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {o.customer}
                          </TableCell>

                          <TableCell>{o.items}</TableCell>

                          <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">${o.total.toFixed(2)}</div>
                            {o.convertedTotal && (
                              <div className="text-xs text-muted-foreground">
                                {getCurrencySymbol()}{o.convertedTotal.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </TableCell>

                          <TableCell>
                            <StatusBadge status={o.status} />
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {renderCreatedAt(o.createdAt)}
                          </TableCell>

                          <TableCell
                            className={`text-right ${isLast ? "rounded-br-xl" : ""}`}
                          >
                            <div className="flex items-center justify-end gap-2">
                              {canRejectOrder && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => rejectOrder(o.orderId)}
                                  disabled={o.status !== "pending"}
                                >
                                  Reject
                                </Button>
                              )}
                              {canAcceptOrder && (
                                <Button
                                  size="sm"
                                  onClick={() => acceptOrder(o.orderId)}
                                  disabled={o.status !== "pending"}
                                >
                                  Accept
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
              <div className="text-sm text-muted-foreground">Page {pagPage} of {totalPages}</div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <Button
                  variant="pagination"
                  clickVariant="default"
                  size="sm"
                  disabled={pagPage <= 1}
                  className="gap-1"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden xs:inline">Previous</span>
                </Button>

                <Button
                  variant="pagination"
                  clickVariant="default"
                  size="sm"
                  disabled={pagPage >= totalPages}
                  className="gap-1"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <span className="hidden xs:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionBoundary>
  );
}
