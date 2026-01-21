"use client";

import * as React from "react";
import { Search, ChevronLeft, ChevronRight, Check, X, Package } from "lucide-react";

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
import { toast } from "sonner";
import { bulkOrdersApi, Order, Pagination } from "@/services/orders";
import { useCurrency } from "@/contexts/currency-context";

type BulkOrderStatus = "pending" | "accepted" | "rejected" | "partially_accepted";

function StatusBadge({ status }: { status: BulkOrderStatus }) {
  const map: Record<BulkOrderStatus, string> = {
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

function ItemStatusBadge({ status }: { status: "pending" | "accepted" | "rejected" }) {
  const map = {
    pending: "bg-amber-500/10 text-amber-700",
    accepted: "bg-emerald-500/10 text-emerald-700",
    rejected: "bg-rose-500/10 text-rose-700",
  };
  return (
    <Badge variant="secondary" className={map[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function BulkOrdersPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const [orders, setOrders] = React.useState<Order[]>([]);
  const [pagination, setPagination] = React.useState<Pagination | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const { getCurrencyCode, convertAmount, getCurrencySymbol } = useCurrency();
  const targetCurrency = getCurrencyCode();

  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"All" | BulkOrderStatus>("All");
  const [page, setPage] = React.useState(1);
  const limit = 10;

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQuery, statusFilter]);

  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (statusFilter !== "All") params.status = statusFilter;
      if (debouncedQuery) params.search = debouncedQuery;

      const response = await bulkOrdersApi.getAll(params);
      setOrders(response.data.orders);
      setPagination(response.data.pagination);
    } catch (error: any) {
      toast.error(error?.message || "Failed to fetch bulk orders");
      setOrders([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, debouncedQuery]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleAcceptItem = async (orderId: string, orderItemId: string) => {
    const key = `${orderId}-${orderItemId}`;
    setActionLoading(key);
    try {
      await bulkOrdersApi.acceptItem(orderId, orderItemId);
      toast.success("Item accepted successfully");
      await fetchOrders();
    } catch (error: any) {
      toast.error(error?.message || "Failed to accept item");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectItem = async (orderId: string, orderItemId: string) => {
    const key = `${orderId}-${orderItemId}`;
    setActionLoading(key);
    try {
      await bulkOrdersApi.rejectItem(orderId, orderItemId);
      toast.success("Item rejected successfully");
      await fetchOrders();
    } catch (error: any) {
      toast.error(error?.message || "Failed to reject item");
    } finally {
      setActionLoading(null);
    }
  };

  const renderCreatedAt = (iso: string) => {
    if (!mounted) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `${getCurrencySymbol()}${num.toFixed(2)}`;
  };

  return (
    <PermissionBoundary screen="/dashboard/bulk-orders" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Bulk Orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review and manage bulk order requests
            </p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-xl sm:text-2xl">All Bulk Orders</CardTitle>

              <div className="flex flex-col sm:flex-row gap-3">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as any)}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="partially_accepted">Partially Accepted</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative w-full sm:w-[260px] md:w-[320px]">
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
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : !orders || orders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No bulk orders found.</div>
            ) : (
              <div className="space-y-6">
                {orders?.map((order) => (
                  <Card key={order.id} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{order.order_number}</h3>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Customer: {order.first_name} {order.last_name} ({order.email})
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {renderCreatedAt(order.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Total Amount</div>
                          <div className="text-xl font-bold">{formatCurrency(order.total_amount)}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>Product</TableHead>
                              <TableHead className="text-center">Qty</TableHead>
                              <TableHead className="text-right">Requested Price</TableHead>
                              <TableHead className="text-right">Offered Price</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {order.order_items?.map((item) => {
                              const actionKey = `${order.id}-${item.id}`;
                              const isActionLoading = actionLoading === actionKey;
                              const isPending = item.item_status === "pending";

                              return (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Package className="h-4 w-4 text-muted-foreground" />
                                      <div>
                                        <div className="font-medium">{item.product_name}</div>
                                        <div className="text-xs text-muted-foreground">{item.product_sku}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(item.requested_price_per_unit || "0")}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-emerald-600">
                                    {formatCurrency(item.offered_price_per_unit || "0")}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <ItemStatusBadge status={item.item_status || "pending"} />
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {isPending ? (
                                      <div className="flex gap-2 justify-end">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1 text-emerald-600 border-emerald-600 hover:bg-emerald-50"
                                          onClick={() => handleAcceptItem(order.id, item.id)}
                                          disabled={isActionLoading}
                                        >
                                          <Check className="h-3 w-3" />
                                          Accept
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1 text-rose-600 border-rose-600 hover:bg-rose-50"
                                          onClick={() => handleRejectItem(order.id, item.id)}
                                          disabled={isActionLoading}
                                        >
                                          <X className="h-3 w-3" />
                                          Reject
                                        </Button>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <Button
                    variant="pagination"
                    clickVariant="default"
                    size="sm"
                    disabled={!pagination.hasPrev}
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
                    disabled={!pagination.hasNext}
                    className="gap-1"
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <span className="hidden xs:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionBoundary>
  );
}
