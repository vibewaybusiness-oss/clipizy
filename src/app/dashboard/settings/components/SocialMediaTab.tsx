"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Instagram, 
  Youtube, 
  Video,
  Link as LinkIcon,
  Unlink,
  Share2,
  Tag,
  Hash
} from "lucide-react";
import { useToast } from "@/hooks/ui/use-toast";
import { getBackendUrl } from "@/lib/config";

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
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-500' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { id: 'tiktok', name: 'TikTok', icon: Video, color: 'bg-black' },
];

export default function SocialMediaTab() {
  const { toast } = useToast();
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

    // Add beforeunload event to save to database
    const handleBeforeUnload = () => {
      saveToDatabase();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Empty dependency array to run only once

  const loadSocialData = async () => {
    try {
      // Load from localStorage first
      const savedSocialSettings = localStorage.getItem('socialSettings');
      if (savedSocialSettings) {
        setSocialSettings(JSON.parse(savedSocialSettings));
      }

      // Load connected social accounts
      const accountsResponse = await fetch('/api/social-media/accounts');
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        setSocialAccounts(accountsData.accounts || []);
      }

      // Load social settings from backend
      const settingsResponse = await fetch(`${getBackendUrl()}/user-management/social-settings`);
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        if (settingsData.success && settingsData.settings) {
          setSocialSettings(settingsData.settings);
          localStorage.setItem('socialSettings', JSON.stringify(settingsData.settings));
        }
      }
    } catch (error) {
      console.error('Error loading social data:', error);
    }
  };

  const handleSocialSettingsChange = (field: keyof SocialSettings, value: boolean | string | number) => {
    const newSocialSettings = {
      ...socialSettings,
      [field]: value
    };
    
    setSocialSettings(newSocialSettings);
    localStorage.setItem('socialSettings', JSON.stringify(newSocialSettings));
  };

  const handleConnectAccount = async (platform: string) => {
    try {
      // Redirect to OAuth flow
      window.location.href = `/api/social-media/connect/${platform}`;
    } catch (error) {
      console.error('Error connecting account:', error);
      toast({
        title: "Error",
        description: "Failed to connect account",
        variant: "destructive"
      });
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
        toast({
          title: "Success",
          description: "Account disconnected successfully"
        });
      } else {
        throw new Error('Failed to disconnect account');
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect account",
        variant: "destructive"
      });
    }
  };

  const saveToDatabase = async () => {
    try {
      await fetch(`${getBackendUrl()}/user-management/social-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(socialSettings),
      });
    } catch (error) {
      console.error('Error saving social settings to database:', error);
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
    <div className="space-y-6 h-full flex flex-col">
      {/* SOCIAL MEDIA PLATFORMS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Share2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Social Media Platforms</h2>
            <p className="text-xs text-muted-foreground">Connect your social media accounts and manage posting preferences</p>
          </div>
        </div>

        <div className="space-y-3">
          {socialPlatforms.map((platform) => {
            const Icon = platform.icon;
            const isConnected = getAccountStatus(platform.id);
            const connectedAccount = getConnectedAccount(platform.id);

            return (
              <div key={platform.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${platform.color} shadow-md`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold">{platform.name}</h3>
                      {isConnected && connectedAccount ? (
                        <div className="flex items-center space-x-2 mt-0.5">
                          <Badge variant="secondary" className="text-xs">
                            <LinkIcon className="w-3 h-3 mr-1" />
                            Connected
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            @{connectedAccount.username}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">Not connected</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={socialSettings.autoPost}
                        onCheckedChange={(checked) => handleSocialSettingsChange('autoPost', checked)}
                      />
                      <Label className="text-xs font-medium">Auto-post</Label>
                    </div>
                    
                    {isConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnectAccount(connectedAccount!.id)}
                        className="px-3 h-8"
                      >
                        <Unlink className="w-3 h-3 mr-1" />
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnectAccount(platform.id)}
                        className="px-3 h-8"
                      >
                        <LinkIcon className="w-3 h-3 mr-1" />
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AUTO-TAGGING SETTINGS */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-500/10">
              <Tag className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Auto-Tagging Settings</h3>
              <p className="text-xs text-muted-foreground">Configure automatic tagging for your content</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Auto-tag @clipizi</Label>
              <p className="text-xs text-muted-foreground">
                Automatically tag @clipizi when publishing content
              </p>
            </div>
            <Switch
              checked={socialSettings.autoTagClipizi}
              onCheckedChange={(checked) => handleSocialSettingsChange('autoTagClipizi', checked)}
            />
          </div>
        </div>
      </div>

      {/* HASHTAGS SETTINGS */}
      <div className="bg-card border border-border rounded-lg p-4 flex-1 flex flex-col">
        <div className="space-y-4 flex-1 flex flex-col">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-green-500/10">
              <Hash className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Hashtag Settings</h3>
              <p className="text-xs text-muted-foreground">Manage hashtag preferences for your posts</p>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Include Hashtags</Label>
                <p className="text-xs text-muted-foreground">
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
                <div>
                  <Label htmlFor="customHashtags" className="text-xs font-medium">Custom Hashtags</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Separate hashtags with spaces
                  </p>
                </div>
                <input
                  id="customHashtags"
                  type="text"
                  value={socialSettings.customHashtags}
                  onChange={(e) => handleSocialSettingsChange('customHashtags', e.target.value)}
                  placeholder="#music #vibewave #ai"
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
