"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";

type Errors = Partial<Record<"name" | "password" | "newPassword", string>>;

export default function ProfileSettingsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [name, setName] = React.useState<string>(user?.name ?? "");
  const [password, setPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Errors>({});

  React.useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!name.trim()) e.name = "Name is required";
    if (!password) e.password = "Password is required";
    if (!newPassword) e.newPassword = "New password is required";
    else if (newPassword.length < 8) e.newPassword = "Password must be at least 8 characters";
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold truncate">Profile Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update your personal profile information</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="ps-name">Name</Label>
              <Input id="ps-name" className="h-10" value={name} onChange={(e) => setName(e.target.value)} />
              {errors.name ? <p className="text-xs text-red-600">{errors.name}</p> : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ps-password">Password</Label>
              <PasswordField
                id="ps-password"
                className="h-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {errors.password ? <p className="text-xs text-red-600">{errors.password}</p> : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ps-new-password">New Password</Label>
              <PasswordField
                id="ps-new-password"
                className="h-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              {errors.newPassword ? <p className="text-xs text-red-600">{errors.newPassword}</p> : null}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
