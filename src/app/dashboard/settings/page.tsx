"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  User, 
  Bell, 
  Share2, 
  Settings, 
  CreditCard,
  Menu
} from "lucide-react";
import ProfileNotificationsTab from "./components/ProfileNotificationsTab";
import SocialMediaTab from "./components/SocialMediaTab";
import SettingsTab from "./components/SettingsTab";
import SubscriptionCreditsTab from "./components/SubscriptionCreditsTab";

const settingsTabs = [
  { id: "profile", label: "Profile & Notifications", icon: User, component: ProfileNotificationsTab },
  { id: "social", label: "Social Media", icon: Share2, component: SocialMediaTab },
  { id: "settings", label: "Settings", icon: Settings, component: SettingsTab },
  { id: "subscription", label: "Subscription & Credits", icon: CreditCard, component: SubscriptionCreditsTab },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentTab = settingsTabs.find(tab => tab.id === activeTab);
  const CurrentComponent = currentTab?.component || ProfileNotificationsTab;

  return (
    <div className="flex h-screen">
      {/* DESKTOP SIDEBAR */}
      <div className="hidden lg:block w-64 flex-shrink-0 border-r border-border bg-muted/20">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your preferences</p>
        </div>
        <nav className="p-4 space-y-1">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                className="w-full justify-start h-10"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="w-4 h-4 mr-3" />
                {tab.label}
              </Button>
            );
          })}
        </nav>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full">
        {/* MOBILE HEADER */}
        <div className="lg:hidden p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your preferences</p>
            </div>
            
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="w-4 h-4 mr-2" />
                  Menu
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Settings</h2>
                  <nav className="space-y-2">
                    {settingsTabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <Button
                          key={tab.id}
                          variant={activeTab === tab.id ? "default" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => {
                            setActiveTab(tab.id);
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <Icon className="w-4 h-4 mr-3" />
                          {tab.label}
                        </Button>
                      );
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <CurrentComponent />
        </div>
      </div>
    </div>
  );
}
