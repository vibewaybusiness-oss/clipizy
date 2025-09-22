"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Bell, 
  Save,
  Upload,
  Mail,
  Smartphone
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

interface ProfileSettings {
  name: string;
  email: string;
  bio: string;
  avatar: string;
  publicProfile: boolean;
  showEmail: boolean;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  projectUpdates: boolean;
  socialActivity: boolean;
  systemAlerts: boolean;
}

export default function ProfileNotificationsTab() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>({
    name: user?.name || "",
    email: user?.email || "",
    bio: "",
    avatar: user?.avatar || "",
    publicProfile: false,
    showEmail: false
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
    projectUpdates: true,
    socialActivity: true,
    systemAlerts: true
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/user-management/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          const settings = data.settings;
          setProfileSettings({
            name: settings.profile?.name || user?.name || "",
            email: settings.profile?.email || user?.email || "",
            bio: settings.profile?.bio || "",
            avatar: settings.profile?.avatar || user?.avatar || "",
            publicProfile: settings.profile?.publicProfile || false,
            showEmail: settings.profile?.showEmail || false
          });
          setNotificationSettings({
            emailNotifications: settings.notifications?.emailNotifications || true,
            pushNotifications: settings.notifications?.pushNotifications || false,
            marketingEmails: settings.notifications?.marketingEmails || false,
            projectUpdates: settings.notifications?.projectUpdates || true,
            socialActivity: settings.notifications?.socialActivity || true,
            systemAlerts: settings.notifications?.systemAlerts || true
          });
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleProfileChange = (field: keyof ProfileSettings, value: string | boolean) => {
    setProfileSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNotificationChange = (field: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsData = {
        profile: profileSettings,
        notifications: notificationSettings,
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Handle avatar upload logic here
    toast.info('Avatar upload functionality coming soon');
  };

  return (
    <div className="space-y-6">
      {/* PROFILE SECTION */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal information and profile details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AVATAR SECTION */}
          <div className="flex items-center space-x-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profileSettings.avatar} alt={profileSettings.name} />
              <AvatarFallback className="text-lg">
                {profileSettings.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline" size="sm" asChild>
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Change Avatar
                </label>
              </Button>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <p className="text-sm text-muted-foreground">
                JPG, PNG or GIF. Max size 2MB.
              </p>
            </div>
          </div>

          <Separator />

          {/* PROFILE FIELDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={profileSettings.name}
                onChange={(e) => handleProfileChange('name', e.target.value)}
                placeholder="Enter your display name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profileSettings.email}
                onChange={(e) => handleProfileChange('email', e.target.value)}
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={profileSettings.bio}
              onChange={(e) => handleProfileChange('bio', e.target.value)}
              placeholder="Tell us about yourself"
              rows={3}
            />
          </div>

          {/* PROFILE VISIBILITY SETTINGS */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Profile Visibility</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Public Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Make your profile visible to other users
                  </p>
                </div>
                <Switch
                  checked={profileSettings.publicProfile}
                  onCheckedChange={(checked) => handleProfileChange('publicProfile', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Email Address</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your email on your public profile
                  </p>
                </div>
                <Switch
                  checked={profileSettings.showEmail}
                  onCheckedChange={(checked) => handleProfileChange('showEmail', checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NOTIFICATIONS SECTION */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how you want to be notified about updates and activities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
              </div>
              <Switch
                checked={notificationSettings.emailNotifications}
                onCheckedChange={(checked) => handleNotificationChange('emailNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in your browser
                  </p>
                </div>
              </div>
              <Switch
                checked={notificationSettings.pushNotifications}
                onCheckedChange={(checked) => handleNotificationChange('pushNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">
                  Receive promotional content and updates
                </p>
              </div>
              <Switch
                checked={notificationSettings.marketingEmails}
                onCheckedChange={(checked) => handleNotificationChange('marketingEmails', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Project Updates</Label>
                <p className="text-sm text-muted-foreground">
                    Get notified when your projects are processed
                </p>
              </div>
              <Switch
                checked={notificationSettings.projectUpdates}
                onCheckedChange={(checked) => handleNotificationChange('projectUpdates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Social Activity</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications about likes, comments, and follows
                </p>
              </div>
              <Switch
                checked={notificationSettings.socialActivity}
                onCheckedChange={(checked) => handleNotificationChange('socialActivity', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>System Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Important system updates and maintenance notifications
                </p>
              </div>
              <Switch
                checked={notificationSettings.systemAlerts}
                onCheckedChange={(checked) => handleNotificationChange('systemAlerts', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SAVE BUTTON */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
