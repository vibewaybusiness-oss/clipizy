"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";
import { toast } from "sonner";

interface PrivacySettings {
  profileVisibility: "public" | "private";
  showEmail: boolean;
  allowComments: boolean;
  dataSharing: boolean;
  analyticsTracking: boolean;
  marketingEmails: boolean;
  profileDiscovery: boolean;
  activityVisibility: "public" | "followers" | "private";
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
  sessionTimeout: number;
  apiAccess: boolean;
  dataExport: boolean;
  accountDeletion: boolean;
}

export default function PrivacySecurityPage() {
  const { user } = useAuth();
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profileVisibility: "private",
    showEmail: false,
    allowComments: true,
    dataSharing: false,
    analyticsTracking: true,
    marketingEmails: false,
    profileDiscovery: false,
    activityVisibility: "followers"
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    loginNotifications: true,
    sessionTimeout: 30,
    apiAccess: false,
    dataExport: true,
    accountDeletion: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user-management/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          const settings = data.settings;
          setPrivacySettings({
            profileVisibility: settings.privacy?.profileVisibility || "private",
            showEmail: settings.privacy?.showEmail || false,
            allowComments: settings.privacy?.allowComments || true,
            dataSharing: settings.privacy?.dataSharing || false,
            analyticsTracking: settings.privacy?.analyticsTracking || true,
            marketingEmails: settings.privacy?.marketingEmails || false,
            profileDiscovery: settings.privacy?.profileDiscovery || false,
            activityVisibility: settings.privacy?.activityVisibility || "followers"
          });
          setSecuritySettings({
            twoFactorEnabled: settings.security?.twoFactorEnabled || false,
            loginNotifications: settings.security?.loginNotifications || true,
            sessionTimeout: settings.security?.sessionTimeout || 30,
            apiAccess: settings.security?.apiAccess || false,
            dataExport: settings.security?.dataExport || true,
            accountDeletion: settings.security?.accountDeletion || false
          });
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const settingsData = {
        privacy: privacySettings,
        security: securitySettings,
        updated_at: new Date().toISOString()
      };

      const response = await fetch('/api/user-management/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsData),
      });

      if (response.ok) {
        toast.success('Settings saved successfully');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/user-management/delete-account', {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Account deletion initiated');
        // Redirect to home page or show confirmation
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Privacy & Security</h1>
          <p className="text-muted-foreground">
            Control your privacy settings and account security
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/profile">
              Back to Settings
            </Link>
          </Button>
          <Button onClick={saveSettings} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PRIVACY SETTINGS */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <span>Privacy Settings</span>
            </CardTitle>
            <CardDescription>
              Control who can see your profile and content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Public Profile</Label>
                <p className="text-sm text-muted-foreground">
                  Make your profile visible to other users
                </p>
              </div>
              <Switch
                checked={privacySettings.profileVisibility === "public"}
                onCheckedChange={(checked) => setPrivacySettings({
                  ...privacySettings,
                  profileVisibility: checked ? "public" : "private"
                })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Email Address</Label>
                <p className="text-sm text-muted-foreground">
                  Display your email on your public profile
                </p>
              </div>
              <Switch
                checked={privacySettings.showEmail}
                onCheckedChange={(checked) => setPrivacySettings({
                  ...privacySettings,
                  showEmail: checked
                })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Comments</Label>
                <p className="text-sm text-muted-foreground">
                  Let other users comment on your videos
                </p>
              </div>
              <Switch
                checked={privacySettings.allowComments}
                onCheckedChange={(checked) => setPrivacySettings({
                  ...privacySettings,
                  allowComments: checked
                })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Data Sharing</Label>
                <p className="text-sm text-muted-foreground">
                  Share anonymized data to improve our service
                </p>
              </div>
              <Switch
                checked={privacySettings.dataSharing}
                onCheckedChange={(checked) => setPrivacySettings({
                  ...privacySettings,
                  dataSharing: checked
                })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Analytics Tracking</Label>
                <p className="text-sm text-muted-foreground">
                  Help us understand how you use the platform
                </p>
              </div>
              <Switch
                checked={privacySettings.analyticsTracking}
                onCheckedChange={(checked) => setPrivacySettings({
                  ...privacySettings,
                  analyticsTracking: checked
                })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Profile Discovery</Label>
                <p className="text-sm text-muted-foreground">
                  Allow others to find your profile through search
                </p>
              </div>
              <Switch
                checked={privacySettings.profileDiscovery}
                onCheckedChange={(checked) => setPrivacySettings({
                  ...privacySettings,
                  profileDiscovery: checked
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* SECURITY SETTINGS */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Security Settings</span>
            </CardTitle>
            <CardDescription>
              Manage your account security and access controls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Switch
                checked={securitySettings.twoFactorEnabled}
                onCheckedChange={(checked) => setSecuritySettings({
                  ...securitySettings,
                  twoFactorEnabled: checked
                })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Login Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified of new login attempts
                </p>
              </div>
              <Switch
                checked={securitySettings.loginNotifications}
                onCheckedChange={(checked) => setSecuritySettings({
                  ...securitySettings,
                  loginNotifications: checked
                })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>API Access</Label>
                <p className="text-sm text-muted-foreground">
                  Allow third-party applications to access your account
                </p>
              </div>
              <Switch
                checked={securitySettings.apiAccess}
                onCheckedChange={(checked) => setSecuritySettings({
                  ...securitySettings,
                  apiAccess: checked
                })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Data Export</Label>
                <p className="text-sm text-muted-foreground">
                  Allow downloading your data
                </p>
              </div>
              <Switch
                checked={securitySettings.dataExport}
                onCheckedChange={(checked) => setSecuritySettings({
                  ...securitySettings,
                  dataExport: checked
                })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Account Deletion</Label>
                <p className="text-sm text-muted-foreground">
                  Enable account deletion requests
                </p>
              </div>
              <Switch
                checked={securitySettings.accountDeletion}
                onCheckedChange={(checked) => setSecuritySettings({
                  ...securitySettings,
                  accountDeletion: checked
                })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DANGER ZONE */}
      <Card className="bg-card border border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Danger Zone</span>
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-red-200 dark:border-red-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              These actions cannot be undone. Please be certain before proceeding.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <div>
              <h4 className="font-semibold text-red-800 dark:text-red-200">Delete Account</h4>
              <p className="text-sm text-red-600 dark:text-red-400">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
