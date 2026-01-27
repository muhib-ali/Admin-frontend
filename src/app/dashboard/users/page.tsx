"use client";

import * as React from "react";
import { notifyError, notifySuccess } from "@/utils/notify";
import {
  User,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  FileX2,
  Loader2,
} from "lucide-react";

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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import PermissionBoundary from "@/components/permission-boundary";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
} from "@/services/users";
import { listRoles } from "@/services/roles";

import type { AdminUser, AdminRole } from "@/types/admin.types";
import { UserForm, UserData } from "@/components/users/user-form";

import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

export default function UsersPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [roles, setRoles] = React.useState<AdminRole[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [query, setQuery] = React.useState("");

  const [page, setPage] = React.useState(1);
  const limit = 5;
  const [pagination, setPagination] = React.useState<any | null>(null);

  const [openForm, setOpenForm] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit" | "view">(
    "create"
  );
  const [editUser, setEditUser] = React.useState<AdminUser | null>(null);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const canList = useHasPermission(ENTITY_PERMS.users.list);
  const canCreate = useHasPermission(ENTITY_PERMS.users.create);
  const canRead = useHasPermission(ENTITY_PERMS.users.read);
  const canUpdate = useHasPermission(ENTITY_PERMS.users.update);
  const canDelete = useHasPermission(ENTITY_PERMS.users.delete);

  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  // Load roles for the form dropdown
  React.useEffect(() => {
    (async () => {
      try {
        const { rows } = await listRoles(1, 100);
        setRoles(rows);
      } catch (e: any) {
        console.error(e);
      }
    })();
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        if (!canList) {
          setUsers([]);
          setPagination(null);
          return;
        }
        const { rows, pagination: pg } = await listUsers(
          page,
          limit,
          debouncedQuery || undefined,
          { signal: ac.signal }
        );
        setUsers(rows);
        setPagination(pg ?? null);
      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.message === "canceled") return;
        console.error(e);
        notifyError(e?.response?.data?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [mounted, canList, page, limit, debouncedQuery]);

  const filtered = users;

  const refetchUsers = async () => {
    if (!canList) return;
    const { rows, pagination: pg } = await listUsers(
      page,
      limit,
      debouncedQuery || undefined
    );
    setUsers(rows);
    setPagination(pg ?? null);
  };

  async function handleCreate(data: UserData) {
    if (!mounted || !canCreate) return;
    try {
      await createUser({
        name: data.name,
        email: data.email,
        password: data.password!,
        roleId: data.roleId,
      });
      notifySuccess("User created");
      await refetchUsers();
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Create failed");
    }
  }

  async function openEdit(userId: string) {
    if (!mounted || !canUpdate) return;
    try {
      const user = await getUserById(userId);
      setEditUser(user);
      setFormMode("edit");
      setOpenForm(true);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Failed to open user");
    }
  }

  async function openView(userId: string) {
    if (!mounted || !canRead) return;
    try {
      const user = await getUserById(userId);
      setEditUser(user);
      setFormMode("view");
      setOpenForm(true);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Failed to open user");
    }
  }

  async function handleUpdate(data: UserData) {
    if (!mounted || !canUpdate || !editUser?.id) return;
    try {
      const payload: any = {
        id: editUser.id,
        name: data.name,
        email: data.email,
        roleId: data.roleId,
      };
      if (data.password) {
        payload.password = data.password;
      }
      await updateUser(payload);
      notifySuccess("User updated");
      await refetchUsers();
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Update failed");
    }
  }

  function requestDelete(id: string) {
    if (!mounted || !canDelete) return;
    setDeleteTargetId(id);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!mounted || !canDelete) return;
    if (!deleteTargetId) return;

    try {
      setDeleting(true);
      await deleteUser(deleteTargetId);
      notifySuccess("User deleted");

      const { rows, pagination: pg } = await listUsers(
        page,
        limit,
        debouncedQuery || undefined
      );
      if (rows.length === 0 && page > 1) {
        setPage((p) => p - 1);
      } else {
        setUsers(rows);
        setPagination(pg ?? null);
      }

      setDeleteOpen(false);
      setDeleteTargetId(null);
    } catch (e: any) {
      console.error(e);
      notifyError(e?.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const renderCreatedAt = (iso: string) => {
    if (!mounted) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const pagTotal = pagination?.total ?? filtered.length;
  const pagPage = pagination?.page ?? page;
  const pagTotalPages =
    (pagination?.totalPages ?? Math.ceil(pagTotal / limit)) || 1;

  const pagHasPrev = pagination?.hasPrev ?? pagPage > 1;
  const pagHasNext = pagination?.hasNext ?? pagPage < pagTotalPages;

  const pagStart = pagTotal === 0 ? 0 : (pagPage - 1) * limit + 1;
  const pagEnd = pagTotal === 0 ? 0 : Math.min(pagPage * limit, pagTotal);

  return (
    <PermissionBoundary screen="/dashboard/users" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Users</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage system users and their roles
            </p>
          </div>

          <Button
            className="gap-2 w-full sm:w-auto"
            onClick={() => {
              setFormMode("create");
              setEditUser(null);
              setOpenForm(true);
            }}
            disabled={!canCreate}
          >
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-xl sm:text-2xl">All Users</CardTitle>

              <div className="relative w-full sm:w-[260px] md:w-[320px] lg:w-[350px] max-w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 pl-9 w-full"
                  placeholder="Search users..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-6">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading users…
                </div>
              </div>
            ) : mounted && !canList ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                You don't have permission to view users.
              </div>
            ) : (
              <>
                <div className="mt-1 rounded-xl border overflow-hidden overflow-x-auto">
                  <Table className="min-w-[720px]">
                    <TableHeader>
                      <TableRow className="bg-gray-200">
                        <TableHead className="rounded-tl-xl">User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right rounded-tr-xl">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="p-8 text-center text-muted-foreground"
                          >
                            <div className="flex flex-col items-center justify-center gap-3">
                              <Avatar className="h-16 w-16 border border-dashed border-muted-foreground/30 bg-muted/40">
                                <AvatarFallback>
                                  <FileX2 className="h-7 w-7 text-muted-foreground" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="text-sm font-medium text-foreground">
                                No users found
                              </div>
                              <p className="text-xs text-muted-foreground max-w-xs">
                                {query
                                  ? "No users match your search."
                                  : "Create your first user to get started."}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((u, idx) => {
                          const isLast = idx === filtered.length - 1;
                          return (
                            <TableRow
                              key={u.id}
                              className="odd:bg-muted/30 even:bg-white hover:bg-transparent"
                            >
                              <TableCell
                                className={isLast ? "rounded-bl-xl" : ""}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9 shrink-0">
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                      {u.name?.slice(0, 2).toUpperCase() || (
                                        <User className="h-4 w-4" />
                                      )}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">
                                      {u.name}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="text-sm text-muted-foreground">
                                {u.email}
                              </TableCell>

                              <TableCell>
                                <Badge variant="outline">
                                  {u.role?.title || "No role"}
                                </Badge>
                              </TableCell>

                              <TableCell className="text-sm text-muted-foreground">
                                {renderCreatedAt(u.created_at)}
                              </TableCell>

                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={
                                    u.is_active
                                      ? "bg-green-200 text-green-800 hover:bg-green-200"
                                      : "bg-gray-200 text-muted-foreground hover:bg-gray-200"
                                  }
                                >
                                  {u.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>

                              <TableCell
                                className={`text-right ${
                                  isLast ? "rounded-br-xl" : ""
                                }`}
                              >
                                {/* Hide actions for Platform Admin users */}
                                {u.role?.title?.toLowerCase() !== 'platform admin' && (
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
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-40"
                                    >
                                      {canRead && (
                                        <DropdownMenuItem
                                          className="gap-2"
                                          onClick={() => openView(u.id)}
                                        >
                                          <Eye className="h-4 w-4" />
                                          View
                                        </DropdownMenuItem>
                                      )}
                                      {canUpdate && (
                                        <DropdownMenuItem
                                          className="gap-2"
                                          onClick={() => openEdit(u.id)}
                                        >
                                          <Pencil className="h-4 w-4" />
                                          Edit
                                        </DropdownMenuItem>
                                      )}
                                      {canDelete && (
                                        <DropdownMenuItem
                                          className="gap-2 text-destructive focus:text-destructive"
                                          onClick={() => requestDelete(u.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Delete
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
                  <div className="text-sm text-muted-foreground">Page {pagPage} of {pagTotalPages}</div>

                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    <Button
                      variant="pagination"
                      clickVariant="default"
                      size="sm"
                      disabled={!pagHasPrev}
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
                      disabled={!pagHasNext}
                      className="gap-1"
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <UserForm
          mode={formMode}
          open={openForm}
          onOpenChange={(v) => {
            setOpenForm(v);
            if (!v) setEditUser(null);
          }}
          initialData={
            editUser
              ? {
                  id: editUser.id,
                  name: editUser.name,
                  email: editUser.email,
                  roleId: editUser.role?.id || "",
                }
              : null
          }
          roles={roles}
          onSubmit={formMode === "create" ? handleCreate : handleUpdate}
        />

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={(v: boolean) => {
            if (!v) setDeleteTargetId(null);
            setDeleteOpen(v);
          }}
          title="Delete user"
          description="Are you sure you want to delete this user? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          destructive
          loading={deleting}
          onConfirm={confirmDelete}
        />
      </div>
    </PermissionBoundary>
  );
}
