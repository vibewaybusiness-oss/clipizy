"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Share2, 
  Instagram, 
  Twitter, 
  Youtube, 
  Facebook, 
  Tiktok,
  Link as LinkIcon,
  Unlink,
  Save,
  Settings,
  Hash,
  AtSign
} from "lucide-react";
import { toast } from "sonner";

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  displayName: string;
  avatar: string;
  isConnected: boolean;
  connectedAt?: string;
}

interface SocialSettings {
  autoTagClipizi: boolean;
  includeWatermark: boolean;
  autoPost: boolean;
  postDelay: number; // minutes
  includeHashtags: boolean;
  customHashtags: string;
  tagFriends: boolean;
  crossPost: boolean;
}

const socialPlatforms = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { id: 'twitter', name: 'Twitter', icon: Twitter, color: 'bg-blue-500' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-500' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  { id: 'tiktok', name: 'TikTok', icon: Tiktok, color: 'bg-black' },
];

export default function SocialMediaTab() {
  const [isSaving, setIsSaving] = useState(false);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [socialSettings, setSocialSettings] = useState<SocialSettings>({
    autoTagClipizi: true,
    includeWatermark: true,
    autoPost: false,
    postDelay: 5,
    includeHashtags: true,
    customHashtags: "#music #vibewave #ai",
    tagFriends: false,
    crossPost: false
  });

  useEffect(() => {
    loadSocialData();
  }, []);

  const loadSocialData = async () => {
    try {
      // Load connected social accounts
      const accountsResponse = await fetch('/api/social-media/accounts');
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        setSocialAccounts(accountsData.accounts || []);
      }

      // Load social settings
      const settingsResponse = await fetch('/api/user-management/social-settings');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        if (settingsData.success && settingsData.settings) {
          setSocialSettings(settingsData.settings);
        }
      }
    } catch (error) {
      console.error('Error loading social data:', error);
    }
  };

  const handleSocialSettingsChange = (field: keyof SocialSettings, value: boolean | string | number) => {
    setSocialSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConnectAccount = async (platform: string) => {
    try {
      // Redirect to OAuth flow
      window.location.href = `/api/social-media/connect/${platform}`;
    } catch (error) {
      console.error('Error connecting account:', error);
      toast.error('Failed to connect account');
    }
  };

  const handleDisconnectAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/social-media/disconnect/${accountId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSocialAccounts(prev => 
          prev.map(account => 
            account.id === accountId 
              ? { ...account, isConnected: false, connectedAt: undefined }
              : account
          )
        );
        toast.success('Account disconnected successfully');
      } else {
        throw new Error('Failed to disconnect account');
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      toast.error('Failed to disconnect account');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user-management/social-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(socialSettings),
      });

      if (response.ok) {
        toast.success('Social media settings saved successfully');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving social settings:', error);
      toast.error('Failed to save social media settings');
    } finally {
      setIsSaving(false);
    }
  };

  const getAccountStatus = (platform: string) => {
    const account = socialAccounts.find(acc => acc.platform === platform);
    return account?.isConnected || false;
  };

  const getConnectedAccount = (platform: string) => {
    return socialAccounts.find(acc => acc.platform === platform && acc.isConnected);
  };

  return (
    <div className="space-y-6">
      {/* CONNECTED ACCOUNTS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Connected Social Media Accounts
          </CardTitle>
          <CardDescription>
            Link your social media accounts to enable automatic posting and sharing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {socialPlatforms.map((platform) => {
              const Icon = platform.icon;
              const isConnected = getAccountStatus(platform.id);
              const connectedAccount = getConnectedAccount(platform.id);

              return (
                <div key={platform.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${platform.color}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{platform.name}</h3>
                      {isConnected && connectedAccount ? (
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            <LinkIcon className="w-3 h-3 mr-1" />
                            Connected
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            @{connectedAccount.username}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not connected</p>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {isConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnectAccount(connectedAccount!.id)}
                        className="flex-1"
                      >
                        <Unlink className="w-4 h-4 mr-2" />
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnectAccount(platform.id)}
                        className="flex-1"
                      >
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* SOCIAL MEDIA SETTINGS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Social Media Settings
          </CardTitle>
          <CardDescription>
            Configure how your content is shared and tagged on social media
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AUTO-TAGGING SETTINGS */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AtSign className="w-4 h-4" />
              Auto-Tagging Settings
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-tag @clipizi</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically tag @clipizi when publishing content
                  </p>
                </div>
                <Switch
                  checked={socialSettings.autoTagClipizi}
                  onCheckedChange={(checked) => handleSocialSettingsChange('autoTagClipizi', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Watermark</Label>
                  <p className="text-sm text-muted-foreground">
                    Add Clipizi watermark to shared content
                  </p>
                </div>
                <Switch
                  checked={socialSettings.includeWatermark}
                  onCheckedChange={(checked) => handleSocialSettingsChange('includeWatermark', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* POSTING SETTINGS */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Posting Settings
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-post to Social Media</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically post completed projects to connected accounts
                  </p>
                </div>
                <Switch
                  checked={socialSettings.autoPost}
                  onCheckedChange={(checked) => handleSocialSettingsChange('autoPost', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Hashtags</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically include hashtags in posts
                  </p>
                </div>
                <Switch
                  checked={socialSettings.includeHashtags}
                  onCheckedChange={(checked) => handleSocialSettingsChange('includeHashtags', checked)}
                />
              </div>

              {socialSettings.includeHashtags && (
                <div className="space-y-2">
                  <Label htmlFor="customHashtags">Custom Hashtags</Label>
                  <input
                    id="customHashtags"
                    type="text"
                    value={socialSettings.customHashtags}
                    onChange={(e) => handleSocialSettingsChange('customHashtags', e.target.value)}
                    placeholder="#music #vibewave #ai"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate hashtags with spaces
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Cross-post to All Platforms</Label>
                  <p className="text-sm text-muted-foreground">
                    Post the same content to all connected platforms
                  </p>
                </div>
                <Switch
                  checked={socialSettings.crossPost}
                  onCheckedChange={(checked) => handleSocialSettingsChange('crossPost', checked)}
                />
              </div>
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
