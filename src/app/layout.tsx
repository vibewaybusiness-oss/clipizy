import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ConditionalLayout } from "@/components/conditional-layout"
import { AuthProvider } from "@/contexts/auth-context"
import { PricingProvider } from "@/contexts/pricing-context"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { InfoPopup } from "@/components/info-popup"

export const metadata: Metadata = {
  title: 'clipizi - AI-Powered Music Video Creation',
  description: 'Transform your audio into stunning music videos with the power of AI. Create professional content in minutes, not hours.',
  keywords: 'AI, music video, content creation, video generation, artificial intelligence, creative tools',
  authors: [{ name: 'clipizi Team' }],
  creator: 'clipizi',
  publisher: 'clipizi',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://clipizi.ai'),
  openGraph: {
    title: 'clipizi - AI-Powered Music Video Creation',
    description: 'Transform your audio into stunning music videos with the power of AI. Create professional content in minutes, not hours.',
    url: 'https://clipizi.ai',
    siteName: 'clipizi',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'clipizi - AI Music Video Creation',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'clipizi - AI-Powered Music Video Creation',
    description: 'Transform your audio into stunning music videos with the power of AI.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <PricingProvider>
              <ConditionalLayout>
                {children}
              </ConditionalLayout>
            </PricingProvider>
          </AuthProvider>
        </ThemeProvider>
        <InfoPopup />
        <Toaster />
      </body>
    </html>
  );
}
