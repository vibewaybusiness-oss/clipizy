"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Palette, 
  Globe, 
  Monitor, 
  Moon, 
  Sun,
  Save,
  Volume2,
  VolumeX,
  Zap,
  Shield
} from "lucide-react";
import { toast } from "sonner";

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  soundEnabled: boolean;
  soundVolume: number;
  animationsEnabled: boolean;
  reducedMotion: boolean;
  autoPlay: boolean;
  quality: '720p' | '1080p' | '4k';
  maxVideoLength: number;
  moderateLyrics: boolean;
  dataSaving: boolean;
  developerMode: boolean;
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
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    soundEnabled: true,
    soundVolume: 70,
    animationsEnabled: true,
    reducedMotion: false,
    autoPlay: false,
    quality: '1080p',
    maxVideoLength: 10,
    moderateLyrics: false,
    dataSaving: false,
    developerMode: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/user-management/app-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSettingChange = (field: keyof AppSettings, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user-management/app-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Settings saved successfully');
        // Apply theme changes immediately
        if (settings.theme !== 'system') {
          document.documentElement.setAttribute('data-theme', settings.theme);
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
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

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      case 'system':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* APPEARANCE SETTINGS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the look and feel of the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={settings.theme} onValueChange={(value: 'light' | 'dark' | 'system') => handleSettingChange('theme', value)}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  {getThemeIcon(settings.theme)}
                  <SelectValue placeholder="Select theme" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    Light
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    Dark
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    System
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Animations</Label>
              <p className="text-sm text-muted-foreground">
                Enable smooth animations and transitions
              </p>
            </div>
            <Switch
              checked={settings.animationsEnabled}
              onCheckedChange={(checked) => handleSettingChange('animationsEnabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Reduced Motion</Label>
              <p className="text-sm text-muted-foreground">
                Minimize motion for accessibility
              </p>
            </div>
            <Switch
              checked={settings.reducedMotion}
              onCheckedChange={(checked) => handleSettingChange('reducedMotion', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* LANGUAGE & REGION */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Language & Region
          </CardTitle>
          <CardDescription>
            Set your preferred language and timezone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={settings.language} onValueChange={(value) => handleSettingChange('language', value)}>
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={settings.timezone} onValueChange={(value) => handleSettingChange('timezone', value)}>
              <SelectTrigger>
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
        </CardContent>
      </Card>

      {/* AUDIO SETTINGS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            Audio
          </CardTitle>
          <CardDescription>
            Configure audio preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sound Effects</Label>
              <p className="text-sm text-muted-foreground">
                Enable sound effects and notifications
              </p>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => handleSettingChange('soundEnabled', checked)}
            />
          </div>

          {settings.soundEnabled && (
            <div className="space-y-2">
              <Label>Volume: {settings.soundVolume}%</Label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.soundVolume}
                onChange={(e) => handleSettingChange('soundVolume', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* CONTENT SETTINGS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Content & Quality
          </CardTitle>
          <CardDescription>
            Configure content preferences and quality settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Moderate Lyrics</Label>
              <p className="text-sm text-muted-foreground">
                Generate clean lyrics only
              </p>
            </div>
            <Switch
              checked={settings.moderateLyrics}
              onCheckedChange={(checked) => handleSettingChange('moderateLyrics', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Default Video Quality</Label>
            <Select value={settings.quality} onValueChange={(value: '720p' | '1080p' | '4k') => handleSettingChange('quality', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="720p">720p HD</SelectItem>
                <SelectItem value="1080p">1080p Full HD</SelectItem>
                <SelectItem value="4k">4K Ultra HD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Max Video Length: {settings.maxVideoLength} minutes</Label>
            <input
              type="range"
              min="1"
              max="30"
              value={settings.maxVideoLength}
              onChange={(e) => handleSettingChange('maxVideoLength', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-play Videos</Label>
              <p className="text-sm text-muted-foreground">
                Automatically play videos when they load
              </p>
            </div>
            <Switch
              checked={settings.autoPlay}
              onCheckedChange={(checked) => handleSettingChange('autoPlay', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Data Saving Mode</Label>
              <p className="text-sm text-muted-foreground">
                Reduce data usage by lowering quality
              </p>
            </div>
            <Switch
              checked={settings.dataSaving}
              onCheckedChange={(checked) => handleSettingChange('dataSaving', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ADVANCED SETTINGS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Advanced
          </CardTitle>
          <CardDescription>
            Advanced settings for power users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Developer Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable developer tools and debug information
              </p>
            </div>
            <Switch
              checked={settings.developerMode}
              onCheckedChange={(checked) => handleSettingChange('developerMode', checked)}
            />
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
