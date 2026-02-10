"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
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
  mode: "create" | "edit" | "view";
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
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [roleId, setRoleId] = React.useState(initialData?.roleId ?? "");

  type Errors = Partial<Record<"name" | "email" | "password" | "confirmPassword" | "roleId", string>>;
  const [errors, setErrors] = React.useState<Errors>({});

  React.useEffect(() => {
    if (!open) return;
    setName(initialData?.name ?? "");
    setEmail(initialData?.email ?? "");
    setPassword("");
    setConfirmPassword("");
    setRoleId(initialData?.roleId ?? "");
  }, [open, initialData]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === "view") {
      onOpenChange(false);
      return;
    }

    const nextErrors: Errors = {};
    if (!name.trim()) nextErrors.name = "Name is required";
    if (!email.trim()) nextErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = "Enter a valid email";
    if (!roleId) nextErrors.roleId = "Role is required";
    if (mode === "create" && !password) nextErrors.password = "Password is required";
    else if (password && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]).{8,}/.test(password)) nextErrors.password = "Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character";
    if (mode === "create" && password !== confirmPassword) nextErrors.confirmPassword = "Passwords do not match";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

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

  const isReadOnly = mode === "view";

  const isValid =
    isReadOnly ||
    (name.trim() &&
      email.trim() &&
      roleId &&
      (mode === "edit" || (password && password === confirmPassword)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {mode === "create" ? "Create New User" : mode === "edit" ? "Edit User" : "View User"}
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
              disabled={isReadOnly}
            />
            {errors.name ? <p className="text-xs text-red-600">{errors.name}</p> : null}
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
              disabled={isReadOnly}
            />
            {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user-password">
                Password {mode === "create" ? "*" : "(leave blank to keep current)"}
              </Label>
              <PasswordField
                id="user-password"
                placeholder={mode === "create" ? "Enter password" : "••••••••"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={mode === "create"}
                disabled={isReadOnly}
              />
              {errors.password ? (
                <p className="text-xs text-red-600">{errors.password}</p>
              ) : (
                mode === "create" && password.length > 0 && (
                  <div className="text-xs text-gray-500 space-y-1 mt-2">
                    <p className={password.length >= 8 ? "text-green-600" : ""}>
                      {password.length >= 8 ? "✓" : "•"} At least 8 characters
                    </p>
                    <p className={/[A-Z]/.test(password) ? "text-green-600" : ""}>
                      {/[A-Z]/.test(password) ? "✓" : "•"} One uppercase letter
                    </p>
                    <p className={/[a-z]/.test(password) ? "text-green-600" : ""}>
                      {/[a-z]/.test(password) ? "✓" : "•"} One lowercase letter
                    </p>
                    <p className={/\d/.test(password) ? "text-green-600" : ""}>
                      {/\d/.test(password) ? "✓" : "•"} One number
                    </p>
                    <p className={/[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]/.test(password) ? "text-green-600" : ""}>
                      {/[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]/.test(password) ? "✓" : "•"} One special character
                    </p>
                  </div>
                )
              )}
            </div>
            
            {mode === "create" && (
              <div className="space-y-2">
                <Label htmlFor="user-confirm-password">Confirm Password *</Label>
                <PasswordField
                  id="user-confirm-password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isReadOnly}
                />
                {errors.confirmPassword ? <p className="text-xs text-red-600">{errors.confirmPassword}</p> : null}
              </div>
            )}
          </div>

          <div className="space-y-2 col-span-2">
            <Label>Role *</Label>
            <Select value={roleId} onValueChange={setRoleId} disabled={isReadOnly}>
              <SelectTrigger className="w-full">
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
            {errors.roleId ? <p className="text-xs text-red-600">{errors.roleId}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {isReadOnly ? "Close" : "Cancel"}
            </Button>
            {!isReadOnly && (
              <Button type="submit" disabled={!isValid}>
                {mode === "create" ? "Create" : "Update"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
