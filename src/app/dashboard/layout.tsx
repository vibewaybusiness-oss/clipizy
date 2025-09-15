"use client";

import { useState } from "react";
import { VibewaveLogo } from "@/app/dashboard/components/vibewave-logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/app/dashboard/components/ui/button";
import { Badge } from "@/app/dashboard/components/ui/badge";
import { 
  Home, 
  Plus, 
  FolderOpen, 
  BarChart3, 
  Settings, 
  LogOut, 
  User,
  Menu,
  X,
  TestTube,
  Video
} from "lucide-react";
import { ProtectedRoute } from "@/app/dashboard/components/protected-route";
import { useAuth } from "@/contexts/auth-context";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: Home },
  { name: "Projects", href: "/dashboard/projects", icon: FolderOpen },
  { name: "Video Editor", href: "/dashboard/videomaking", icon: Video },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Test", href: "/dashboard/test", icon: TestTube },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* MOBILE SIDEBAR OVERLAY */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        <div className={`fixed inset-y-0 left-0 z-50 w-16 bg-gray-900 transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex flex-col h-full">
            {/* SIDEBAR HEADER */}
            <div className="flex items-center justify-center p-4">
              <Link href="/" className="flex items-center justify-center w-8 h-8 group">
                <VibewaveLogo className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden absolute top-2 right-2 text-white hover:bg-white/10"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* NAVIGATION */}
            <nav className="flex-1 px-2 py-4">
              <ul className="space-y-3">
                {/* CREATE BUTTON */}
                <li>
                  <Link
                    href="/dashboard/create"
                    className="flex items-center justify-center w-12 h-12 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 group"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Plus className="w-5 h-5 text-white" />
                  </Link>
                </li>

                {/* NAVIGATION ITEMS */}
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "text-white/70 hover:text-white hover:bg-white/10"
                        }`}
                        onClick={() => setSidebarOpen(false)}
                        title={item.name}
                      >
                        <Icon className="w-5 h-5" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* USER PROFILE */}
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-12 h-12 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                onClick={logout}
                title="Sign Out"
              >
                <User className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="md:ml-16">
          {/* MOBILE MENU BUTTON */}
          <div className="md:hidden fixed top-4 left-4 z-40">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="bg-gray-900/80 backdrop-blur border border-gray-700 text-white hover:bg-gray-800"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* PAGE CONTENT */}
          <main className="flex-1 min-h-screen bg-background">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}