"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth";
import { notifyError, notifySuccess } from "@/utils/notify";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";

type Errors = Partial<Record<"name" | "currentPassword" | "newPassword" | "confirmPassword" | "general", string>>;

export default function AccountSettingsPage() {
  const { data: session } = useSession();
  const [user, setUser] = React.useState<any>(null);
  const [name, setName] = React.useState("");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [errors, setErrors] = React.useState<Errors>({});

  // Load user data on component mount and when session changes
  React.useEffect(() => {
    console.log("Session data:", session);
    
    // Try localStorage first (like navbar), fallback to NextAuth session
    const userData = authService.getUser();
    console.log("User data from localStorage:", userData);
    
    if (userData) {
      setUser(userData);
      // Try different possible name fields
      const userName = userData.name || userData.fullname || userData.username || userData.email || "";
      console.log("Setting name from localStorage:", userName);
      setName(userName);
      return;
    }
    
    // Fallback to NextAuth session
    if (session?.user) {
      console.log("Using session user:", session.user);
      setUser(session.user);
      const userName = session.user.name || session.user.email || "";
      console.log("Setting name from session:", userName);
      setName(userName);
    } else {
      console.log("No user data found");
    }
  }, [session]);

  // Listen for profile updates to refresh form
  React.useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      console.log('📝 Account settings: Profile update event received!', event.detail);
      const updatedUser = event.detail.user;
      
      // Update form state
      setUser(updatedUser);
      const userName = updatedUser.name || updatedUser.email || "";
      console.log('📝 Account settings: Updating form name to:', userName);
      setName(userName);
    };

    // Listen for user login events (when switching accounts)
    const handleUserLogin = (event: CustomEvent) => {
      console.log('📝 Account settings: User login event received!', event.detail);
      const newUser = event.detail.user;
      
      // Update form state with new user data
      setUser(newUser);
      const userName = newUser.name || newUser.email || "";
      console.log('📝 Account settings: Updating form name to:', userName);
      setName(userName);
    };

    // Listen for logout events
    const handleUserLogout = (event: CustomEvent) => {
      console.log('📝 Account settings: User logout event received!', event.detail);
      
      // Clear form state
      setUser(null);
      setName("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    };

    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
    window.addEventListener('userLoggedIn', handleUserLogin as EventListener);
    window.addEventListener('userLoggedOut', handleUserLogout as EventListener);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
      window.removeEventListener('userLoggedIn', handleUserLogin as EventListener);
      window.removeEventListener('userLoggedOut', handleUserLogout as EventListener);
    };
  }, []);

  const validateProfile = (): Errors => {
    const e: Errors = {};
    if (!name.trim()) e.name = "Name is required";
    return e;
  };

  const validatePassword = (): Errors => {
    const e: Errors = {};
    if (!currentPassword) e.currentPassword = "Current password is required";
    if (!newPassword) e.newPassword = "New password is required";
    else if (newPassword.length < 8) e.newPassword = "Password must be greater than 8 characters";
    if (!confirmPassword) e.confirmPassword = "Please confirm your new password";
    else if (confirmPassword !== newPassword) e.confirmPassword = "Passwords do not match";
    return e;
  };

  const onProfileSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validateProfile();
    setErrors(e);
    if (Object.keys(e).length) return;

    console.log("Submitting profile update with name:", name.trim());

    try {
      setSavingProfile(true);
      setErrors({});

      // Only send name field for profile update
      const response = await authService.updateProfile({
        name: name.trim(),
      });

      console.log("Profile update response:", response);

      if (response.status) {
        notifySuccess("Profile updated successfully");
        
        // Update local state
        setUser(response.data);
        console.log("Updated user data:", response.data);
        
        // Update localStorage
        const currentUser = authService.getUser();
        if (currentUser) {
          const updatedUser = { ...currentUser, ...response.data };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          console.log("Updated localStorage:", updatedUser);
        }
        
        // Dispatch custom event with detailed logging
        console.log("About to dispatch profileUpdated event");
        const event = new CustomEvent('profileUpdated', { 
          detail: { user: response.data } 
        });
        console.log("Event created:", event);
        window.dispatchEvent(event);
        console.log("Event dispatched");
        
        // Also try direct localStorage update as backup
        setTimeout(() => {
          console.log("Checking localStorage after event dispatch:");
          const checkUser = localStorage.getItem("user");
          console.log("localStorage user:", checkUser);
        }, 100);
        
      } else {
        console.log("Profile update failed:", response);
        setErrors({ general: response.message || "Failed to update profile" });
      }
    } catch (error: any) {
      console.error("Profile update error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to update profile";
      setErrors({ general: errorMessage });
      notifyError(errorMessage);
    } finally {
      setSavingProfile(false);
    }
  };

  const onPasswordSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validatePassword();
    setErrors(e);
    if (Object.keys(e).length) return;

    try {
      setSaving(true);
      setErrors({});

      // Only send password fields for password update
      const response = await authService.updateProfile({
        currentPassword,
        newPassword,
      });

      if (response.status) {
        notifySuccess("Password updated successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setErrors({ general: response.message || "Failed to update password" });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to update password";
      setErrors({ general: errorMessage });
      notifyError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold truncate">Profile Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage account information and security</p>
      </div>

      {/* Profile Information Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onProfileSubmit}>
            {errors.general ? (
              <div className="p-3 rounded-md bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input 
                id="profile-name" 
                type="text" 
                className="h-10" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                disabled={savingProfile}
                placeholder="Enter your name"
              />
              {errors.name ? <p className="text-xs text-red-600">{errors.name}</p> : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input 
                id="profile-email" 
                type="email" 
                className="h-10" 
                value={user?.email || ""} 
                disabled
                placeholder="Email address"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Update Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password Change Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onPasswordSubmit}>
            {errors.general ? (
              <div className="p-3 rounded-md bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="as-current">Current Password</Label>
              <PasswordField 
                id="as-current" 
                className="h-10" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                disabled={saving}
              />
              {errors.currentPassword ? <p className="text-xs text-red-600">{errors.currentPassword}</p> : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="as-new">New Password</Label>
              <PasswordField 
                id="as-new" 
                className="h-10" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                disabled={saving}
              />
              {errors.newPassword ? <p className="text-xs text-red-600">{errors.newPassword}</p> : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="as-confirm">Confirm New Password</Label>
              <PasswordField 
                id="as-confirm" 
                className="h-10" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                disabled={saving}
              />
              {errors.confirmPassword ? <p className="text-xs text-red-600">{errors.confirmPassword}</p> : null}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Update Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
