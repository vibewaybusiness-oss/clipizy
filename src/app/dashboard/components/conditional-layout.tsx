"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "@/app/dashboard/components/navigation";
import { Footer } from "@/app/dashboard/components/footer";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/auth");
  const isDashboardPage = pathname.startsWith("/dashboard");

  if (isAuthPage || isDashboardPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen">
        {children}
      </main>
      <Footer />
    </>
  );
}
