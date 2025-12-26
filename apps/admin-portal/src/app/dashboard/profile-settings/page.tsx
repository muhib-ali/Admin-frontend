"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";

type Errors = Partial<Record<"name" | "email" | "phone", string>>;

export default function ProfileSettingsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [name, setName] = React.useState<string>(user?.name ?? "");
  const [email, setEmail] = React.useState<string>(user?.email ?? "");
  const [phone, setPhone] = React.useState<string>(user?.phone ?? "");

  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Errors>({});

  React.useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.name, user?.email, user?.phone]);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Enter a valid email";
    if (phone.trim() && !/^[+\d\s()-]{7,}$/.test(phone.trim())) e.phone = "Enter a valid phone number";
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
              <Label htmlFor="ps-email">Email</Label>
              <Input id="ps-email" type="email" className="h-10" value={email} onChange={(e) => setEmail(e.target.value)} />
              {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ps-phone">Phone</Label>
              <Input id="ps-phone" className="h-10" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
              {errors.phone ? <p className="text-xs text-red-600">{errors.phone}</p> : null}
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
