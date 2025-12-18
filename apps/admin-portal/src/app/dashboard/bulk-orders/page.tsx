"use client";

import * as React from "react";
import { Search, ChevronLeft, ChevronRight, MoreHorizontal, Layers, Boxes } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

type BulkOrderStatus = "Queued" | "Processing" | "Completed" | "Failed";

type BulkOrderRow = {
  id: string;
  name: string;
  records: number;
  status: BulkOrderStatus;
  createdAt: string;
};

const DUMMY_BULK: BulkOrderRow[] = [
  {
    id: "BULK-2001",
    name: "December Import - Region A",
    records: 120,
    status: "Queued",
    createdAt: "2025-12-16T11:02:00Z",
  },
  {
    id: "BULK-2002",
    name: "Wholesale Upload - Batch 17",
    records: 560,
    status: "Processing",
    createdAt: "2025-12-16T12:47:00Z",
  },
  {
    id: "BULK-2003",
    name: "Promo Orders - Q4",
    records: 980,
    status: "Completed",
    createdAt: "2025-12-15T09:20:00Z",
  },
  {
    id: "BULK-2004",
    name: "Legacy Migration",
    records: 240,
    status: "Failed",
    createdAt: "2025-12-14T16:05:00Z",
  },
  {
    id: "BULK-2005",
    name: "Partner Drop-Ship",
    records: 330,
    status: "Completed",
    createdAt: "2025-12-13T08:33:00Z",
  },
  {
    id: "BULK-2006",
    name: "Backorders Refresh",
    records: 75,
    status: "Queued",
    createdAt: "2025-12-12T14:09:00Z",
  },
];

function StatusBadge({ status }: { status: BulkOrderStatus }) {
  if (status === "Completed") return <Badge>Completed</Badge>;
  if (status === "Processing") return <Badge variant="secondary">Processing</Badge>;
  if (status === "Queued") return <Badge variant="outline">Queued</Badge>;
  return <Badge variant="destructive">Failed</Badge>;
}

export default function BulkOrdersPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const limit = 5;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DUMMY_BULK;
    return DUMMY_BULK.filter((b) =>
      [b.id, b.name, b.status].some((v) => String(v).toLowerCase().includes(q))
    );
  }, [query]);

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

  return (
    <PermissionBoundary screen="/dashboard/bulk-orders" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Bulk Orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload and track bulk order processing
            </p>
          </div>

          <Button className="gap-2 w-full sm:w-auto">
            <Layers className="h-4 w-4" />
            New Bulk Upload
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-xl sm:text-2xl">All Bulk Orders</CardTitle>

              <div className="relative w-full sm:w-[260px] md:w-[320px] lg:w-[350px] max-w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 pl-9 w-full"
                  placeholder="Search bulk orders..."
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
                    <TableHead className="rounded-tl-xl">Batch</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right rounded-tr-xl">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No bulk orders found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((b, idx) => {
                      const isLast = idx === rows.length - 1;
                      return (
                        <TableRow
                          key={b.id}
                          className="odd:bg-muted/30 even:bg-white hover:bg-transparent"
                        >
                          <TableCell className={isLast ? "rounded-bl-xl" : ""}>
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-md bg-muted">
                                <Boxes className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="font-medium truncate">{b.id}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {b.name}
                          </TableCell>

                          <TableCell>{b.records}</TableCell>

                          <TableCell>
                            <StatusBadge status={b.status} />
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {renderCreatedAt(b.createdAt)}
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
                                <DropdownMenuItem className="cursor-pointer">
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                  Retry
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
              <div className="text-sm text-muted-foreground">
                Showing {pagStart} to {pagEnd} of {total} bulk orders
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagPage <= 1}
                  className="gap-1"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden xs:inline">Previous</span>
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <Button
                      key={pg}
                      variant={pg === pagPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pg)}
                      className="w-8 h-8 p-0 text-xs"
                    >
                      {pg}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
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
