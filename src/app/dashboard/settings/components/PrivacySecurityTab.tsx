"use client";

import { useState, useEffect } from "react";
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
  CheckCircle,
  Key,
  Download,
  UserX
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
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
  searchable: boolean;
  showOnlineStatus: boolean;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
  sessionTimeout: number;
  apiAccess: boolean;
  dataExport: boolean;
  accountDeletion: boolean;
  passwordExpiry: boolean;
  suspiciousActivityAlerts: boolean;
}

export default function PrivacySecurityTab() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profileVisibility: "private",
    showEmail: false,
    allowComments: true,
    dataSharing: false,
    analyticsTracking: true,
    marketingEmails: false,
    profileDiscovery: false,
    activityVisibility: "followers",
    searchable: true,
    showOnlineStatus: false
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    loginNotifications: true,
    sessionTimeout: 30,
    apiAccess: false,
    dataExport: true,
    accountDeletion: false,
    passwordExpiry: false,
    suspiciousActivityAlerts: true
  });

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
            activityVisibility: settings.privacy?.activityVisibility || "followers",
            searchable: settings.privacy?.searchable || true,
            showOnlineStatus: settings.privacy?.showOnlineStatus || false
          });
          setSecuritySettings({
            twoFactorEnabled: settings.security?.twoFactorEnabled || false,
            loginNotifications: settings.security?.loginNotifications || true,
            sessionTimeout: settings.security?.sessionTimeout || 30,
            apiAccess: settings.security?.apiAccess || false,
            dataExport: settings.security?.dataExport || true,
            accountDeletion: settings.security?.accountDeletion || false,
            passwordExpiry: settings.security?.passwordExpiry || false,
            suspiciousActivityAlerts: settings.security?.suspiciousActivityAlerts || true
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

  const handlePrivacyChange = (field: keyof PrivacySettings, value: string | boolean) => {
    setPrivacySettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSecurityChange = (field: keyof SecuritySettings, value: boolean | number) => {
    setSecuritySettings(prev => ({
      ...prev,
      [field]: value
    }));
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

  const handleDownloadData = async () => {
    try {
      const response = await fetch('/api/user-management/export-data');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clipizi-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Data export started');
      } else {
        throw new Error('Failed to export data');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PRIVACY SETTINGS */}
      <Card>
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
              onCheckedChange={(checked) => handlePrivacyChange('profileVisibility', checked ? "public" : "private")}
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
              onCheckedChange={(checked) => handlePrivacyChange('showEmail', checked)}
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
              onCheckedChange={(checked) => handlePrivacyChange('allowComments', checked)}
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
              onCheckedChange={(checked) => handlePrivacyChange('profileDiscovery', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Online Status</Label>
              <p className="text-sm text-muted-foreground">
                Let others see when you're online
              </p>
            </div>
            <Switch
              checked={privacySettings.showOnlineStatus}
              onCheckedChange={(checked) => handlePrivacyChange('showOnlineStatus', checked)}
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
              onCheckedChange={(checked) => handlePrivacyChange('dataSharing', checked)}
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
              onCheckedChange={(checked) => handlePrivacyChange('analyticsTracking', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* SECURITY SETTINGS */}
      <Card>
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
              onCheckedChange={(checked) => handleSecurityChange('twoFactorEnabled', checked)}
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
              onCheckedChange={(checked) => handleSecurityChange('loginNotifications', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Suspicious Activity Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified of unusual account activity
              </p>
            </div>
            <Switch
              checked={securitySettings.suspiciousActivityAlerts}
              onCheckedChange={(checked) => handleSecurityChange('suspiciousActivityAlerts', checked)}
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
              onCheckedChange={(checked) => handleSecurityChange('apiAccess', checked)}
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
              onCheckedChange={(checked) => handleSecurityChange('dataExport', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ACCOUNT ACTIONS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="w-5 h-5" />
            <span>Account Actions</span>
          </CardTitle>
          <CardDescription>
            Manage your account data and security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="flex-1" asChild>
              <a href="/dashboard/settings/change-password">
                <Key className="w-4 h-4 mr-2" />
                Change Password
              </a>
            </Button>
            
            <Button variant="outline" onClick={handleDownloadData} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download Data
            </Button>
          </div>
        </CardContent>
      </Card>

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

      {/* SAVE BUTTON */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
