"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus, Search, Users } from "lucide-react";

import PermissionBoundary from "@/components/permission-boundary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive";
  joinedAt: string;
};

const DUMMY_CUSTOMERS: CustomerRow[] = [
  {
    id: "CUST-001",
    name: "Ayesha Khan",
    email: "ayesha.khan@example.com",
    phone: "+92 300 1234567",
    status: "Active",
    joinedAt: "2025-12-14T10:15:00Z",
  },
  {
    id: "CUST-002",
    name: "Ali Raza",
    email: "ali.raza@example.com",
    phone: "+92 301 5550123",
    status: "Active",
    joinedAt: "2025-12-13T12:05:00Z",
  },
  {
    id: "CUST-003",
    name: "Sara Ahmed",
    email: "sara.ahmed@example.com",
    phone: "+92 302 8899001",
    status: "Inactive",
    joinedAt: "2025-12-10T15:42:00Z",
  },
  {
    id: "CUST-004",
    name: "Hassan Ali",
    email: "hassan.ali@example.com",
    phone: "+92 303 2221133",
    status: "Active",
    joinedAt: "2025-12-08T09:20:00Z",
  },
  {
    id: "CUST-005",
    name: "Noor Fatima",
    email: "noor.fatima@example.com",
    phone: "+92 304 7776677",
    status: "Active",
    joinedAt: "2025-12-07T18:11:00Z",
  },
  {
    id: "CUST-006",
    name: "Umar Farooq",
    email: "umar.farooq@example.com",
    phone: "+92 305 1112233",
    status: "Inactive",
    joinedAt: "2025-12-05T08:33:00Z",
  },
];

function StatusBadge({ status }: { status: CustomerRow["status"] }) {
  return (
    <Badge
      variant="secondary"
      className={
        status === "Active"
          ? "bg-green-200 text-green-800 hover:bg-green-200"
          : "bg-gray-200 text-muted-foreground hover:bg-gray-200"
      }
    >
      {status}
    </Badge>
  );
}

export default function CustomersPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const limit = 6;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DUMMY_CUSTOMERS;
    return DUMMY_CUSTOMERS.filter((c) =>
      [c.id, c.name, c.email, c.phone, c.status].some((v) =>
        String(v).toLowerCase().includes(q)
      )
    );
  }, [query]);

  React.useEffect(() => setPage(1), [query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pagPage = Math.min(page, totalPages);
  const pagStart = total === 0 ? 0 : (pagPage - 1) * limit + 1;
  const pagEnd = total === 0 ? 0 : Math.min(pagPage * limit, total);

  const rows = React.useMemo(() => {
    const start = (pagPage - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, pagPage]);

  const renderJoinedAt = (iso: string) => {
    if (!mounted) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <PermissionBoundary screen="/dashboard/customers" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Customers</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage customers</p>
          </div>

          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-xl sm:text-2xl">All Customers</CardTitle>

              <div className="relative w-full sm:w-[260px] md:w-[320px] lg:w-[350px] max-w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 pl-9 w-full"
                  placeholder="Search customers..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-6">
            <div className="mt-1 rounded-xl border overflow-hidden overflow-x-auto">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow className="bg-gray-200">
                    <TableHead className="rounded-tl-xl">Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined At</TableHead>
                    <TableHead className="text-right rounded-tr-xl">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
                        No customers found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((c, idx) => {
                      const isLast = idx === rows.length - 1;
                      return (
                        <TableRow key={c.id} className="odd:bg-muted/30 even:bg-white hover:bg-transparent">
                          <TableCell className={isLast ? "rounded-bl-xl" : ""}>
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-md bg-muted">
                                <Users className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="font-medium truncate">{c.name}</div>
                                <div className="text-xs text-muted-foreground">{c.id}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>{c.email}</TableCell>
                          <TableCell>{c.phone}</TableCell>

                          <TableCell>
                            <StatusBadge status={c.status} />
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {renderJoinedAt(c.joinedAt)}
                          </TableCell>

                          <TableCell className={`text-right ${isLast ? "rounded-br-xl" : ""}`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem className="cursor-pointer">View</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">Edit</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600">Delete</DropdownMenuItem>
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
              <div className="text-sm text-muted-foreground">Showing {pagStart} to {pagEnd} of {total} customers</div>

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
