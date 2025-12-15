"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "lucide-react";
import type { AdminRole } from "@/types/admin.types";

export interface UserData {
  id?: string;
  name: string;
  email: string;
  password?: string;
  roleId: string;
}

export interface UserFormProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialData?: UserData | null;
  roles: AdminRole[];
  onSubmit?: (data: UserData) => void;
}

export function UserForm({ mode, open, onOpenChange, initialData, roles, onSubmit }: UserFormProps) {
  const [name, setName] = React.useState(initialData?.name ?? "");
  const [email, setEmail] = React.useState(initialData?.email ?? "");
  const [password, setPassword] = React.useState("");
  const [roleId, setRoleId] = React.useState(initialData?.roleId ?? "");

  React.useEffect(() => {
    if (!open) return;
    setName(initialData?.name ?? "");
    setEmail(initialData?.email ?? "");
    setPassword("");
    setRoleId(initialData?.roleId ?? "");
  }, [open, initialData]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: UserData = {
      id: initialData?.id,
      name: name.trim(),
      email: email.trim(),
      roleId,
    };
    if (password) {
      payload.password = password;
    }
    onSubmit?.(payload);
    onOpenChange(false);
  }

  const isValid = name.trim() && email.trim() && roleId && (mode === "edit" || password);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {mode === "create" ? "Create New User" : "Edit User"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">Name *</Label>
            <Input
              id="user-name"
              placeholder="Enter user name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Email *</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-password">
              Password {mode === "create" ? "*" : "(leave blank to keep current)"}
            </Label>
            <Input
              id="user-password"
              type="password"
              placeholder={mode === "create" ? "Enter password" : "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={mode === "create"}
            />
          </div>

          <div className="space-y-2">
            <Label>Role *</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              {mode === "create" ? "Create" : "Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
