"use client";

import * as React from "react";
import { Search, ChevronLeft, ChevronRight, MoreHorizontal, Package, Truck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type OrderStatus = "Pending" | "Processing" | "Shipped" | "Delivered";

type OrderRow = {
  id: string;
  customer: string;
  items: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
};

const DUMMY_ORDERS: OrderRow[] = [
  {
    id: "ORD-1001",
    customer: "Platform Admin",
    items: 3,
    total: 149.99,
    status: "Pending",
    createdAt: "2025-12-16T10:15:00Z",
  },
  {
    id: "ORD-1002",
    customer: "Customer A",
    items: 1,
    total: 39.5,
    status: "Processing",
    createdAt: "2025-12-16T12:05:00Z",
  },
  {
    id: "ORD-1003",
    customer: "Customer B",
    items: 5,
    total: 389,
    status: "Shipped",
    createdAt: "2025-12-16T15:42:00Z",
  },
  {
    id: "ORD-1004",
    customer: "Customer C",
    items: 2,
    total: 89.99,
    status: "Delivered",
    createdAt: "2025-12-15T09:20:00Z",
  },
  {
    id: "ORD-1005",
    customer: "Customer D",
    items: 4,
    total: 219.0,
    status: "Processing",
    createdAt: "2025-12-14T18:11:00Z",
  },
  {
    id: "ORD-1006",
    customer: "Customer E",
    items: 6,
    total: 540.25,
    status: "Pending",
    createdAt: "2025-12-13T08:33:00Z",
  },
  {
    id: "ORD-1007",
    customer: "Customer F",
    items: 2,
    total: 74.75,
    status: "Shipped",
    createdAt: "2025-12-12T14:09:00Z",
  },
];

type OrderFormValues = {
  id: string;
  customer: string;
  items: number;
  total: number;
  status: OrderStatus;
};

function nextOrderId(existing: OrderRow[]) {
  const nums = existing
    .map((o) => Number(String(o.id).replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `ORD-${max + 1}`;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, string> = {
    Pending: "bg-amber-500/10 text-amber-700",
    Processing: "bg-sky-500/10 text-sky-700",
    Shipped: "bg-indigo-500/10 text-indigo-700",
    Delivered: "bg-emerald-500/10 text-emerald-700",
  };
  return (
    <Badge variant="secondary" className={map[status]}>
      {status}
    </Badge>
  );
}

export default function OrdersPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [orders, setOrders] = React.useState<OrderRow[]>(DUMMY_ORDERS);

  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const limit = 5;

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"create" | "view" | "edit">(
    "create"
  );
  const [activeOrder, setActiveOrder] = React.useState<OrderRow | null>(null);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<OrderRow | null>(null);

  const [form, setForm] = React.useState<OrderFormValues>({
    id: "",
    customer: "",
    items: 1,
    total: 0,
    status: "Pending",
  });

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      [o.id, o.customer, o.status].some((v) =>
        String(v).toLowerCase().includes(q)
      )
    );
  }, [query, orders]);

  React.useEffect(() => {
    setPage(1);
  }, [query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pagPage = Math.min(page, totalPages);
  const pagStart = total === 0 ? 0 : (pagPage - 1) * limit + 1;
  const pagEnd = total === 0 ? 0 : Math.min(pagPage * limit, total);

  const rows = React.useMemo(() => {
    const start = (pagPage - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, pagPage]);

  const renderCreatedAt = (iso: string) => {
    if (!mounted) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const openCreate = () => {
    const id = nextOrderId(orders);
    setDialogMode("create");
    setActiveOrder(null);
    setForm({ id, customer: "", items: 1, total: 0, status: "Pending" });
    setDialogOpen(true);
  };

  const openView = (o: OrderRow) => {
    setDialogMode("view");
    setActiveOrder(o);
    setForm({ id: o.id, customer: o.customer, items: o.items, total: o.total, status: o.status });
    setDialogOpen(true);
  };

  const openEdit = (o: OrderRow) => {
    setDialogMode("edit");
    setActiveOrder(o);
    setForm({ id: o.id, customer: o.customer, items: o.items, total: o.total, status: o.status });
    setDialogOpen(true);
  };

  const requestDelete = (o: OrderRow) => {
    setDeleteTarget(o);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setOrders((prev) => prev.filter((x) => x.id !== deleteTarget.id));
    toast.success("Order deleted");
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: OrderRow = {
      id: form.id.trim(),
      customer: form.customer.trim(),
      items: Number(form.items) || 0,
      total: Number(form.total) || 0,
      status: form.status,
      createdAt: activeOrder?.createdAt ?? new Date().toISOString(),
    };

    if (!payload.customer) {
      toast.error("Customer is required");
      return;
    }
    if (payload.items <= 0) {
      toast.error("Items must be greater than 0");
      return;
    }
    if (payload.total < 0) {
      toast.error("Total cannot be negative");
      return;
    }

    if (dialogMode === "create") {
      setOrders((prev) => [payload, ...prev]);
      toast.success("Order created");
      setDialogOpen(false);
      return;
    }

    setOrders((prev) => prev.map((x) => (x.id === payload.id ? payload : x)));
    toast.success("Order updated");
    setDialogOpen(false);
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

          <Button className="gap-2 w-full sm:w-auto" onClick={openCreate}>
            <Package className="h-4 w-4" />
            Create Order
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-xl sm:text-2xl">All Orders</CardTitle>

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
                  {rows.length === 0 ? (
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
                          key={o.id}
                          className="odd:bg-muted/30 even:bg-white hover:bg-transparent"
                        >
                          <TableCell className={isLast ? "rounded-bl-xl" : ""}>
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-md bg-muted">
                                <Truck className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="font-medium truncate">{o.id}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {o.customer}
                          </TableCell>

                          <TableCell>{o.items}</TableCell>

                          <TableCell>${o.total.toFixed(2)}</TableCell>

                          <TableCell>
                            <StatusBadge status={o.status} />
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {renderCreatedAt(o.createdAt)}
                          </TableCell>

                          <TableCell
                            className={`text-right ${isLast ? "rounded-br-xl" : ""}`}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  aria-label="More actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => openView(o)}
                                >
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => openEdit(o)}
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-destructive"
                                  onClick={() => requestDelete(o)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="p-0">
            <DialogHeader className="px-6 pt-6 pb-3">
              <DialogTitle>
                {dialogMode === "create"
                  ? "Create Order"
                  : dialogMode === "edit"
                    ? `Edit ${form.id}`
                    : `Order ${form.id}`}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSave} className="flex max-h-[90vh] flex-col">
              <div className="px-6 pb-6 overflow-y-auto max-h-[calc(90vh-160px)]">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="order-id">Order ID</Label>
                    <Input id="order-id" value={form.id} disabled />
                  </div>
                  <div>
                    <Label htmlFor="order-status">Status</Label>
                    <Input
                      id="order-status"
                      value={form.status}
                      disabled={dialogMode === "view"}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          status: e.target.value as OrderStatus,
                        }))
                      }
                      placeholder="Pending / Processing / Shipped / Delivered"
                    />
                    <div className="mt-1 text-xs text-muted-foreground">
                      Allowed: Pending, Processing, Shipped, Delivered
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="order-customer">Customer *</Label>
                    <Input
                      id="order-customer"
                      value={form.customer}
                      disabled={dialogMode === "view"}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, customer: e.target.value }))
                      }
                      placeholder="Customer name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="order-items">Items *</Label>
                    <Input
                      id="order-items"
                      type="number"
                      min={1}
                      value={form.items}
                      disabled={dialogMode === "view"}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          items: Number(e.target.value),
                        }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="order-total">Total ($)</Label>
                    <Input
                      id="order-total"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.total}
                      disabled={dialogMode === "view"}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          total: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="sticky flex justify-end gap-3 border-t bg-background px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  {dialogMode === "view" ? "Close" : "Cancel"}
                </Button>
                {dialogMode !== "view" && (
                  <Button type="submit">
                    {dialogMode === "create" ? "Create" : "Update"}
                  </Button>
                )}
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={(v) => {
            if (!v) setDeleteTarget(null);
            setDeleteOpen(v);
          }}
          title="Delete order"
          description={deleteTarget ? `Are you sure you want to delete order ${deleteTarget.id}? This action cannot be undone.` : "This action cannot be undone."}
          confirmText="Delete"
          cancelText="Cancel"
          destructive
          onConfirm={confirmDelete}
        />
      </div>
    </PermissionBoundary>
  );
}
