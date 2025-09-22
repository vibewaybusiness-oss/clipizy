"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Settings, 
  Palette, 
  Globe, 
  Monitor, 
  Moon, 
  Sun,
  Eye,
  User,
  Mail,
  Search,
  Activity
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/ui/use-toast";
import { getBackendUrl } from "@/lib/config";

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
}

interface PrivacySettings {
  profileVisibility: "public" | "private";
  showEmail: boolean;
  marketingEmails: boolean;
  activityVisibility: "public" | "followers" | "private";
  searchable: boolean;
  publicProfile: boolean;
}

const languages = [
  { value: 'en', label: 'English' }
];

const timezones = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' }
];

export default function SettingsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'system',
    language: 'en',
    timezone: 'UTC'
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profileVisibility: "private",
    showEmail: false,
    marketingEmails: false,
    activityVisibility: "followers",
    searchable: true,
    publicProfile: false
  });

  useEffect(() => {
    loadSettings();

    // Add beforeunload event to save to database
    const handleBeforeUnload = () => {
      saveToDatabase();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Empty dependency array to run only once

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Load from localStorage first
      const savedAppSettings = localStorage.getItem('appSettings');
      if (savedAppSettings) {
        setSettings(JSON.parse(savedAppSettings));
      }

      const savedPrivacySettings = localStorage.getItem('privacySettings');
      if (savedPrivacySettings) {
        setPrivacySettings(JSON.parse(savedPrivacySettings));
      }

      // Load from backend for initial sync
      const appResponse = await fetch(`${getBackendUrl()}/user-management/app-settings`);
      if (appResponse.ok) {
        const appData = await appResponse.json();
        if (appData.success && appData.settings) {
          setSettings(appData.settings);
          localStorage.setItem('appSettings', JSON.stringify(appData.settings));
        }
      }

      const privacyResponse = await fetch(`${getBackendUrl()}/user-management/settings`);
      if (privacyResponse.ok) {
        const privacyData = await privacyResponse.json();
        if (privacyData.success && privacyData.settings) {
          const settings = privacyData.settings;
          const privacySettings = {
            profileVisibility: settings.privacy?.profileVisibility || "private",
            showEmail: settings.privacy?.showEmail || false,
            marketingEmails: settings.privacy?.marketingEmails || false,
            activityVisibility: settings.privacy?.activityVisibility || "followers",
            searchable: settings.privacy?.searchable || true,
            publicProfile: settings.privacy?.publicProfile || false
          };
          setPrivacySettings(privacySettings);
          localStorage.setItem('privacySettings', JSON.stringify(privacySettings));
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (field: keyof AppSettings, value: string | number | boolean) => {
    const newSettings = {
      ...settings,
      [field]: value
    };
    
    setSettings(newSettings);

    // Save to localStorage immediately
    localStorage.setItem('appSettings', JSON.stringify(newSettings));

    // Apply theme changes immediately
    if (field === 'theme') {
      if (value !== 'system') {
        document.documentElement.setAttribute('data-theme', value as string);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  };

  const handlePrivacyChange = (field: keyof PrivacySettings, value: string | boolean) => {
    const newPrivacySettings = {
      ...privacySettings,
      [field]: value
    };
    
    setPrivacySettings(newPrivacySettings);

    // Save to localStorage immediately
    localStorage.setItem('privacySettings', JSON.stringify(newPrivacySettings));
  };

  const saveToDatabase = async () => {
    try {
      // Save app settings
      await fetch(`${getBackendUrl()}/user-management/app-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      // Save privacy settings
      await fetch(`${getBackendUrl()}/user-management/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privacy: privacySettings,
          updated_at: new Date().toISOString()
        }),
      });
    } catch (error) {
      console.error('Error saving settings to database:', error);
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
    <div className="space-y-6 h-full flex flex-col">
      {/* SETTINGS TITLE */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-primary/10">
          <Settings className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Settings</h2>
          <p className="text-xs text-muted-foreground">Manage your application preferences and privacy settings</p>
        </div>
      </div>

      {/* ALL SETTINGS IN SINGLE DIV */}
      <div className="space-y-6">
        {/* APPLICATION SETTINGS */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-500/10">
                <Palette className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Application Settings</h3>
                <p className="text-xs text-muted-foreground">Customize your app experience</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* THEME SETTING */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Theme</Label>
                <Select value={settings.theme} onValueChange={(value: 'light' | 'dark' | 'system') => handleSettingChange('theme', value)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="w-3 h-3" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="w-3 h-3" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-3 h-3" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* LANGUAGE SETTING */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Language</Label>
                <Select value={settings.language} onValueChange={(value) => handleSettingChange('language', value)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* TIMEZONE SETTING */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Timezone</Label>
                <Select value={settings.timezone} onValueChange={(value) => handleSettingChange('timezone', value)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* PRIVACY SETTINGS */}
        <div className="bg-card border border-border rounded-lg p-4 flex-1 flex flex-col">
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-green-500/10">
                <Eye className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Privacy Settings</h3>
                <p className="text-xs text-muted-foreground">Control your privacy and visibility preferences</p>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              {/* PROFILE VISIBILITY SETTINGS */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground">Profile Visibility</h4>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 rounded-md bg-purple-500/10">
                      <User className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Public Profile</Label>
                      <p className="text-xs text-muted-foreground">
                        Make your profile visible to other users
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={privacySettings.publicProfile}
                    onCheckedChange={(checked) => handlePrivacyChange('publicProfile', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 rounded-md bg-blue-500/10">
                      <Mail className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Show Email Address</Label>
                      <p className="text-xs text-muted-foreground">
                        Display your email on your public profile
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={privacySettings.showEmail}
                    onCheckedChange={(checked) => handlePrivacyChange('showEmail', checked)}
                  />
                </div>
              </div>

              {/* CONTENT PROMOTION SETTING */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Content Promotion</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow Clipizy to promote the content on the website (Hashtags clipizy has to be activated) - will push the best creations on the homepage.
                  </p>
                </div>
                <Switch
                  checked={privacySettings.profileVisibility === "public"}
                  onCheckedChange={(checked) => handlePrivacyChange('profileVisibility', checked ? "public" : "private")}
                />
              </div>

              {/* MARKETING EMAILS SETTING */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Marketing Emails</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive promotional emails and updates
                  </p>
                </div>
                <Switch
                  checked={privacySettings.marketingEmails}
                  onCheckedChange={(checked) => handlePrivacyChange('marketingEmails', checked)}
                />
              </div>

              {/* ACTIVITY VISIBILITY SETTING */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 rounded-md bg-orange-500/10">
                    <Activity className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Activity Visibility</Label>
                    <p className="text-xs text-muted-foreground">
                      Control who can see your activity
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={privacySettings.activityVisibility}
                    onChange={(e) => handlePrivacyChange('activityVisibility', e.target.value)}
                    className="px-2 py-1.5 border border-input rounded-md bg-background text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  >
                    <option value="public">Public</option>
                    <option value="followers">Followers Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>

              {/* SEARCHABLE SETTING */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 rounded-md bg-cyan-500/10">
                    <Search className="w-4 h-4 text-cyan-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Searchable Profile</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow others to find your profile through search
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.searchable}
                  onCheckedChange={(checked) => handlePrivacyChange('searchable', checked)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
