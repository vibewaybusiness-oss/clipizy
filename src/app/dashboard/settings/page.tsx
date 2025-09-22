"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Bell, 
  Share2, 
  Settings, 
  Shield, 
  CreditCard,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import ProfileNotificationsTab from "./components/ProfileNotificationsTab";
import SocialMediaTab from "./components/SocialMediaTab";
import SettingsTab from "./components/SettingsTab";
import PrivacySecurityTab from "./components/PrivacySecurityTab";
import SubscriptionPointsTab from "./components/SubscriptionPointsTab";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="p-8 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/profile">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>
        </div>
      </div>

      {/* VERTICAL TABS LAYOUT */}
      <div className="flex gap-6">
        {/* LEFT SIDEBAR - TABS */}
        <div className="w-64 flex-shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full">
            <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 space-y-2">
              <TabsTrigger 
                value="profile" 
                className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <User className="w-4 h-4 mr-3" />
                Profile & Notifications
              </TabsTrigger>
              <TabsTrigger 
                value="social" 
                className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Share2 className="w-4 h-4 mr-3" />
                Social Media
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Settings className="w-4 h-4 mr-3" />
                Settings
              </TabsTrigger>
              <TabsTrigger 
                value="privacy" 
                className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Shield className="w-4 h-4 mr-3" />
                Privacy & Security
              </TabsTrigger>
              <TabsTrigger 
                value="subscription" 
                className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <CreditCard className="w-4 h-4 mr-3" />
                Subscription & Points
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* RIGHT CONTENT AREA */}
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="profile" className="mt-0">
              <ProfileNotificationsTab />
            </TabsContent>
            <TabsContent value="social" className="mt-0">
              <SocialMediaTab />
            </TabsContent>
            <TabsContent value="settings" className="mt-0">
              <SettingsTab />
            </TabsContent>
            <TabsContent value="privacy" className="mt-0">
              <PrivacySecurityTab />
            </TabsContent>
            <TabsContent value="subscription" className="mt-0">
              <SubscriptionPointsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
