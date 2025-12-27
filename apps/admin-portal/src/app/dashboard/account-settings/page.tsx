"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Errors = Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>>;

export default function AccountSettingsPage() {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Errors>({});

  const validate = (): Errors => {
    const e: Errors = {};
    if (!currentPassword) e.currentPassword = "Current password is required";
    if (!newPassword) e.newPassword = "New password is required";
    else if (newPassword.length < 8) e.newPassword = "Password must be at least 8 characters";
    if (!confirmPassword) e.confirmPassword = "Please confirm your new password";
    else if (confirmPassword !== newPassword) e.confirmPassword = "Passwords do not match";
    return e;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    try {
      setSaving(true);
      await new Promise((r) => setTimeout(r, 500));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold truncate">Account Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage account security and credentials</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="as-current">Current Password</Label>
              <Input id="as-current" type="password" className="h-10" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              {errors.currentPassword ? <p className="text-xs text-red-600">{errors.currentPassword}</p> : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="as-new">New Password</Label>
              <Input id="as-new" type="password" className="h-10" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              {errors.newPassword ? <p className="text-xs text-red-600">{errors.newPassword}</p> : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="as-confirm">Confirm New Password</Label>
              <Input id="as-confirm" type="password" className="h-10" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              {errors.confirmPassword ? <p className="text-xs text-red-600">{errors.confirmPassword}</p> : null}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Update"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
