import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication - Vibewave",
  description: "Sign in or create your Vibewave account to start creating amazing AI-generated music videos.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}

