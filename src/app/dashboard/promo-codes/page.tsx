"use client";

import * as React from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  TicketPercent,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {Eye} from "lucide-react";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import PermissionBoundary from "@/components/permission-boundary";
import { notifyError, notifySuccess } from "@/utils/notify";
import PromoCodeFormDialog, {
  PromoCodeFormValues,
} from "@/components/promo-codes/promo-code-form";
import api from "@/services/lib/api";
import { usePromoCodesService, PromoCode } from "@/services/promo-codes";
import { useHasPermission } from "@/hooks/use-permission";
import { ENTITY_PERMS } from "@/rbac/permissions-map";

type PromoCodeRow ={
id: string,
title: string,
value: number,
usage_limit: number,
expires_at: string,
active: boolean,
};
function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="secondary"
      className={
        active
          ? "bg-green-200 text-green-800 hover:bg-green-200"
          : "bg-gray-200 text-muted-foreground hover:bg-gray-200"
      }
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}


export default function PromoCodesPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const promoCodesService = usePromoCodesService(api);

  const [rows, setRows] = React.useState<PromoCode[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [total, setTotal] = React.useState(0);

  const [page, setPage] = React.useState(1);
  const limit = 5;

  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  const [openForm, setOpenForm] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit" | "view">(
    "create"
  );
  const [current, setCurrent] = React.useState<PromoCodeFormValues | undefined>(
    undefined
  );

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<PromoCode | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const canList = useHasPermission(ENTITY_PERMS.promoCodes.list);
  const canCreate = useHasPermission(ENTITY_PERMS.promoCodes.create);
  const canRead = useHasPermission(ENTITY_PERMS.promoCodes.read);
  const canUpdate = useHasPermission(ENTITY_PERMS.promoCodes.update);
  const canDelete = useHasPermission(ENTITY_PERMS.promoCodes.delete);

  const fetch = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await promoCodesService.getAllPromoCodes({
        page,
        limit,
        search: debouncedQuery || undefined,
      });
      if (response.status) {
        setRows(response.data.promoCodes);
        setTotal(response.data.pagination.total);
      }
    } catch (err: any) {
      notifyError(err?.message || "Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  }, [promoCodesService, page, limit, debouncedQuery]);

  React.useEffect(() => {
    if (!mounted) return;
    fetch();
  }, [fetch, mounted]);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const openCreate = () => {
    setFormMode("create");
    setCurrent(undefined);
    setOpenForm(true);
  };

  const openEdit = (r: PromoCode) => {
    setFormMode("edit");
    setCurrent({
      id: r.id,
      code: r.code,
      value: Number(r.value),
      usage_limit: r.usage_limit,
      expires_at: r.expires_at,
      active: r.is_active,
    });
    setOpenForm(true);
  };

  const openView = (r: PromoCode) => {
    setFormMode("view");
    setCurrent({
      id: r.id,
      code: r.code,
      value: Number(r.value),
      usage_limit: r.usage_limit,
      expires_at: r.expires_at,
      active: r.is_active,
    });
    setOpenForm(true);
  };

  const requestRemove = (r: PromoCode) => {
    setDeleteTarget(r);
    setDeleteOpen(true);
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    try {
      await promoCodesService.deletePromoCode({ id: deleteTarget.id });
      notifySuccess("Promo code deleted");
      fetch();
    } catch (err: any) {
      notifyError(err?.message || "Failed to delete promo code");
    }
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const upsert = async (data: PromoCodeFormValues) => {
    try {
      if (formMode === "create") {
        await promoCodesService.createPromoCode({
          code: data.code,
          value: data.value,
          usageLimit: data.usage_limit,
          expiresAt: data.expires_at,
          isActive: data.active,
        });
        notifySuccess("Promo code created");
      } else {
        await promoCodesService.updatePromoCode({
          id: data.id!,
          code: data.code,
          value: data.value,
          usageLimit: data.usage_limit,
          expiresAt: data.expires_at,
          isActive: data.active,
        });
        notifySuccess("Promo code updated");
      }
      setOpenForm(false);
      setCurrent(undefined);
      fetch();
    } catch (err: any) {
      notifyError(err?.message || `Failed to ${formMode} promo code`);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageSafe = Math.min(Math.max(1, page), totalPages);

  return (
    <PermissionBoundary screen="/dashboard/promo-codes" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Promo Codes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage promo codes
            </p>
          </div>

          <Button className="gap-2 w-full sm:w-auto" onClick={openCreate}  disabled={!canCreate}>
            <Plus className="h-4 w-4" />
            Add Promo Code
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-xl sm:text-2xl">All Promo Codes</CardTitle>

              <div className="relative w-full sm:w-[260px] md:w-[320px] lg:w-[350px] max-w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 pl-9 w-full"
                  placeholder="Search promo codes..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-6">
            <div className="mt-1 rounded-xl border overflow-hidden overflow-x-auto">
              <Table className="min-w-[920px]">
                <TableHeader>
                  <TableRow className="bg-gray-200">
                    <TableHead className="rounded-tl-xl px-4 py-3">Code</TableHead>
                    <TableHead className="px-4 py-3">Value</TableHead>
                    <TableHead className="px-4 py-3">Usage limit</TableHead>
                    <TableHead className="px-4 py-3">Expires At</TableHead>
                    <TableHead className="px-4 py-3">Status</TableHead>
                    <TableHead className="px-4 py-3">Created At</TableHead>
                    <TableHead className="text-right rounded-tr-xl px-4 py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!mounted ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-8 text-center text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-8 text-center text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-8 text-center text-muted-foreground">
                        No promo codes found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((p, idx) => {
                      const isLast = idx === rows.length - 1;
                      return (
                        <TableRow
                          key={p.id}
                          className="odd:bg-muted/30 even:bg-white hover:bg-transparent"
                        >
                          <TableCell className={`${isLast ? "rounded-bl-xl" : ""} px-4 py-3`}>
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-md bg-muted">
                                <TicketPercent className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="font-medium truncate">{p.code}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="px-4 py-3">{p.value}</TableCell>
                          <TableCell className="px-4 py-3">{p.usage_limit}</TableCell>
                          <TableCell className="text-sm text-muted-foreground px-4 py-3">
                            {fmtDateTime(p.expires_at)}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <StatusBadge active={p.is_active} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground px-4 py-3">
                            {fmtDateTime(p.created_at)}
                          </TableCell>

                          <TableCell className={`text-right ${isLast ? "rounded-br-xl" : ""} px-4 py-3`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                   {canRead && (
                                                                  <DropdownMenuItem
                                                                    className="gap-2"
                                                                    onClick={() => openView(p)}
                                                                  >
                                                                    <Eye className="h-4 w-4" />
                                                                    View
                                                                  </DropdownMenuItem>
                                                                )}
                                                                {canUpdate && (
                                                                  <DropdownMenuItem
                                                                    className="gap-2"
                                                                    onClick={() => openEdit(p)}
                                                                  >
                                                                    <Pencil className="h-4 w-4" />
                                                                    Edit
                                                                  </DropdownMenuItem>
                                                                )}
                                 {canDelete && (
                                                                 <DropdownMenuItem
                                                                   className="gap-2 text-destructive focus:text-destructive"
                                                                   onClick={() => requestRemove(p)}
                                                                 >
                                                                   <Trash2 className="h-4 w-4" />
                                                                   Delete
                                                                 </DropdownMenuItem>
                                                               )}
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

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {total === 0 ? "" : `Showing ${(pageSafe - 1) * limit + 1}-${Math.min(pageSafe * limit, total)} of ${total}`}
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <Button
                  variant="pagination"
                  clickVariant="default"
                  size="sm"
                  disabled={pageSafe <= 1}
                  className="gap-1"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>

                <Button
                  variant="pagination"
                  clickVariant="default"
                  size="sm"
                  disabled={pageSafe >= totalPages}
                  className="gap-1"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <PromoCodeFormDialog
          open={openForm}
          onOpenChange={(v) => {
            setOpenForm(v);
            if (!v) setCurrent(undefined);
          }}
          mode={formMode}
          initial={current}
          onSubmit={upsert}
        />

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={(v) => {
            if (!v) setDeleteTarget(null);
            setDeleteOpen(v);
          }}
          title="Delete promo code"
          description={
            deleteTarget
              ? `Are you sure you want to delete promo code “${deleteTarget.code}”? This action cannot be undone.`
              : "This action cannot be undone."
          }
          confirmText="Delete"
          cancelText="Cancel"
          destructive
          loading={false}
          onConfirm={confirmRemove}
        />
      </div>
    </PermissionBoundary>
  );
}
