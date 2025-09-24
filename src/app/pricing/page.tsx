"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/ui/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Check,
  Star,
  Zap,
  Crown,
  ArrowRight,
  Coins,
  Video,
  Download,
  Users,
  Clock,
  Shield,
  Headphones,
  Sparkles,
  Loader2,
  Moon,
  Sun,
  ArrowLeft,
  Plus,
  TrendingUp
} from "lucide-react";
import Link from "next/link";

// Mock Stripe components for now - replace with actual Stripe imports when packages are installed
const loadStripe = (publishableKey: string) => {
  return Promise.resolve({
    embeddedCheckout: {
      create: async (options: any) => {
        // Mock implementation
        return {
          mount: (element: string) => {
            const el = document.getElementById(element);
            if (el) {
              el.innerHTML = `
                <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
                  <h3 style="margin-bottom: 16px;">Stripe Checkout (Mock)</h3>
                  <p style="margin-bottom: 12px;">Plan: ${options.clientSecret ? 'Creator Plan' : 'Pro Plan'}</p>
                  <p style="margin-bottom: 12px;">Price: $${options.clientSecret ? '19.00' : '49.00'}/month</p>
                  <p style="margin-bottom: 16px;">This is a mock checkout form. In production, this would be the actual Stripe embedded checkout.</p>
                  <button onclick="window.location.href='/dashboard/settings?tab=subscription&success=true'" 
                          style="background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; width: 100%;">
                    Complete Mock Payment
                  </button>
                </div>
              `;
            }
          }
        };
      }
    }
  });
};

const EmbeddedCheckoutProvider = ({ children, stripe, options }: any) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (options.fetchClientSecret) {
      options.fetchClientSecret().then((secret: string) => {
        setClientSecret(secret);
        setLoading(false);
      });
    }
  }, [options]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading checkout...</span>
      </div>
    );
  }

  return <div>{children}</div>;
};

const EmbeddedCheckout = ({ planId }: { planId: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme } = useTheme();

  const planDetails = {
    creator: {
      name: 'Creator Plan',
      price: '$19.00/month',
      credits: '2,000 credits'
    },
    pro: {
      name: 'Pro Plan',
      price: '$49.00/month',
      credits: '6,000 credits'
    }
  };

  const currentPlan = planDetails[planId as keyof typeof planDetails] || planDetails.creator;

  useEffect(() => {
    // Enhanced mock checkout form rendering with theme support
    const checkoutElement = document.getElementById('checkout-form');
    if (checkoutElement) {
      const isDark = theme === 'dark';
      const bgGradient = isDark 
        ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' 
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      const cardBg = isDark ? '#1f2937' : 'white';
      const textColor = isDark ? 'white' : '#1f2937';
      const labelColor = isDark ? '#d1d5db' : '#374151';
      const inputBg = isDark ? '#374151' : 'white';
      const inputBorder = isDark ? '#4b5563' : '#e5e7eb';
      const inputFocus = isDark ? '#60a5fa' : '#3b82f6';
      
      checkoutElement.innerHTML = `
        <div style="
          background: ${bgGradient};
          border-radius: 12px;
          padding: 20px;
          color: white;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          position: relative;
          overflow: hidden;
          height: 100%;
          display: flex;
          flex-direction: column;
        ">
          <!-- Background Pattern -->
          <div style="
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 15px 15px;
            animation: float 20s ease-in-out infinite;
          "></div>
          
          <div style="position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 20px; flex-shrink: 0;">
              <div style="
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(255,255,255,0.2);
                padding: 6px 12px;
                border-radius: 16px;
                margin-bottom: 12px;
                backdrop-filter: blur(10px);
              ">
                <div style="width: 6px; height: 6px; background: #f59e0b; border-radius: 50%;"></div>
                <span style="font-size: 12px; font-weight: 500;">Demo Checkout</span>
              </div>
              <h3 style="margin: 0; font-size: 18px; font-weight: 700; margin-bottom: 6px;">
                ${currentPlan.name}
              </h3>
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">
                ${currentPlan.credits} • ${currentPlan.price}
              </p>
            </div>

            <!-- Plan Summary -->
            <div style="
              background: rgba(255,255,255,0.15);
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 16px;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255,255,255,0.2);
              flex-shrink: 0;
            ">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-weight: 600; font-size: 14px;">Plan</span>
                <span style="font-weight: 700; font-size: 16px;">${currentPlan.price}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="opacity: 0.9; font-size: 14px;">Credits per month</span>
                <span style="font-weight: 600; font-size: 14px;">${currentPlan.credits}</span>
              </div>
            </div>

            <!-- Payment Form -->
            <div style="background: ${cardBg}; border-radius: 8px; padding: 16px; color: ${textColor}; flex: 1; display: flex; flex-direction: column;">
              <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; color: ${labelColor}; font-size: 14px;">Email</label>
                <input type="email" placeholder="your@email.com" 
                       style="
                         width: 100%; 
                         padding: 10px 12px; 
                         border: 2px solid ${inputBorder}; 
                         border-radius: 6px; 
                         font-size: 14px;
                         background: ${inputBg};
                         color: ${textColor};
                         transition: border-color 0.2s;
                         box-sizing: border-box;
                       " 
                       onfocus="this.style.borderColor='${inputFocus}'"
                       onblur="this.style.borderColor='${inputBorder}'" />
              </div>

              <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; color: ${labelColor}; font-size: 14px;">Card Information</label>
                <input type="text" placeholder="1234 1234 1234 1234" 
                       style="
                         width: 100%; 
                         padding: 10px 12px; 
                         border: 2px solid ${inputBorder}; 
                         border-radius: 6px; 
                         font-size: 14px;
                         background: ${inputBg};
                         color: ${textColor};
                         margin-bottom: 8px;
                         transition: border-color 0.2s;
                         box-sizing: border-box;
                       " 
                       onfocus="this.style.borderColor='${inputFocus}'"
                       onblur="this.style.borderColor='${inputBorder}'" />
                <div style="display: flex; gap: 8px;">
                  <input type="text" placeholder="MM/YY" 
                         style="
                           flex: 1; 
                           padding: 10px 12px; 
                           border: 2px solid ${inputBorder}; 
                           border-radius: 6px; 
                           font-size: 14px;
                           background: ${inputBg};
                           color: ${textColor};
                           transition: border-color 0.2s;
                           box-sizing: border-box;
                         " 
                         onfocus="this.style.borderColor='${inputFocus}'"
                         onblur="this.style.borderColor='${inputBorder}'" />
                  <input type="text" placeholder="CVC" 
                         style="
                           flex: 1; 
                           padding: 10px 12px; 
                           border: 2px solid ${inputBorder}; 
                           border-radius: 6px; 
                           font-size: 14px;
                           background: ${inputBg};
                           color: ${textColor};
                           transition: border-color 0.2s;
                           box-sizing: border-box;
                         " 
                         onfocus="this.style.borderColor='${inputFocus}'"
                         onblur="this.style.borderColor='${inputBorder}'" />
                </div>
              </div>

              <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; color: ${labelColor}; font-size: 14px;">Cardholder Name</label>
                <input type="text" placeholder="Full name on card" 
                       style="
                         width: 100%; 
                         padding: 10px 12px; 
                         border: 2px solid ${inputBorder}; 
                         border-radius: 6px; 
                         font-size: 14px;
                         background: ${inputBg};
                         color: ${textColor};
                         transition: border-color 0.2s;
                         box-sizing: border-box;
                       " 
                       onfocus="this.style.borderColor='${inputFocus}'"
                       onblur="this.style.borderColor='${inputBorder}'" />
              </div>

              <button onclick="handleMockPayment()" 
                      style="
                        background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
                        color: white; 
                        padding: 12px 20px; 
                        border: none; 
                        border-radius: 8px; 
                        cursor: pointer; 
                        width: 100%; 
                        font-weight: 600;
                        font-size: 14px;
                        transition: transform 0.2s, box-shadow 0.2s;
                        box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
                        flex-shrink: 0;
                      " 
                      onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(22, 163, 74, 0.4)'"
                      onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(22, 163, 74, 0.3)'">
                Subscribe for ${currentPlan.price}
              </button>

              <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                margin-top: 12px;
                color: ${isDark ? '#9ca3af' : '#6b7280'};
                font-size: 12px;
                flex-shrink: 0;
              ">
                <div style="
                  width: 14px;
                  height: 14px;
                  background: linear-gradient(135deg, #635bff 0%, #00d4ff 100%);
                  border-radius: 2px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-size: 8px;
                  font-weight: bold;
                ">S</div>
                <span>Secured by Stripe</span>
              </div>
            </div>
          </div>
        </div>

        <style>
          @keyframes float {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            33% { transform: translate(30px, -30px) rotate(120deg); }
            66% { transform: translate(-20px, 20px) rotate(240deg); }
          }
        </style>
      `;
    }
  }, [currentPlan, theme]);

  const handleMockPayment = () => {
    toast({
      title: "Payment Successful!",
      description: "Your subscription has been activated. Redirecting to success page...",
    });
    setTimeout(() => {
      window.location.href = `/dashboard/pricing/success?plan=${planId}&email=user@example.com`;
    }, 2000);
  };

  // Make handleMockPayment available globally for the mock form
  useEffect(() => {
    (window as any).handleMockPayment = handleMockPayment;
  }, []);

  return <div id="checkout-form" />;
};

const creditsPackages = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 1000,
    price: 10,
    bonus: 0,
    popular: false,
    description: "Perfect for trying out clipizy",
    features: ["1,000 credits", "Basic video generation", "Standard quality"],
    color: "border-gray-200"
  },
  {
    id: "creator",
    name: "Creator Pack",
    credits: 5000,
    price: 40,
    bonus: 1000,
    popular: true,
    description: "Most popular choice for creators",
    features: ["5,000 credits", "1,000 bonus credits", "High quality generation", "Priority processing"],
    color: "border-blue-200"
  },
  {
    id: "pro",
    name: "Pro Pack",
    credits: 15000,
    price: 100,
    bonus: 5000,
    popular: false,
    description: "For professional content creators",
    features: ["15,000 credits", "5,000 bonus credits", "Ultra high quality", "Priority processing", "Advanced features"],
    color: "border-purple-200"
  }
];

const subscriptionPlans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    description: "Perfect for trying out clipizy",
    features: [
      "100 credits per month",
      "Basic video generation",
      "Standard quality (720p)",
      "5 minutes max video length",
      "Community support",
      "Basic templates"
    ],
    limitations: [
      "Limited to 3 videos per month",
      "Watermark on videos",
      "No priority processing"
    ],
    color: "border-gray-200",
    buttonText: "Current Plan",
    buttonVariant: "outline" as const,
    popular: false
  },
  {
    id: "creator",
    name: "Creator",
    price: 19,
    period: "month",
    description: "Perfect for content creators and influencers",
    features: [
      "2,000 credits per month",
      "High quality generation (1080p)",
      "10 minutes max video length",
      "Priority processing",
      "Advanced templates",
      "No watermarks",
      "Email support",
      "Custom branding"
    ],
    limitations: [],
    color: "border-blue-200",
    buttonText: "Upgrade to Creator",
    buttonVariant: "default" as const,
    popular: true
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    period: "month",
    description: "For professional creators and agencies",
    features: [
      "6,000 credits per month",
      "Ultra high quality (4K)",
      "30 minutes max video length",
      "Highest priority processing",
      "All templates + custom styles",
      "No watermarks",
      "Priority support",
      "Custom branding",
      "API access",
      "Team collaboration",
      "Advanced analytics"
    ],
    limitations: [],
    color: "border-purple-200",
    buttonText: "Upgrade to Pro",
    buttonVariant: "default" as const,
    popular: false
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "month",
    description: "For large teams and organizations",
    features: [
      "Unlimited credits",
      "Ultra high quality (4K+)",
      "Unlimited video length",
      "Instant processing",
      "Custom templates & styles",
      "White-label solution",
      "Dedicated support",
      "Custom integrations",
      "Advanced API access",
      "Team management",
      "Custom analytics",
      "SLA guarantee"
    ],
    limitations: [],
    color: "border-gold-200",
    buttonText: "Contact Sales",
    buttonVariant: "outline" as const,
    popular: false
  }
];


const features = [
  {
    category: "Video Generation",
    items: [
      { name: "AI-powered video creation", free: true, creator: true, pro: true, enterprise: true },
      { name: "Multiple visual styles", free: true, creator: true, pro: true, enterprise: true },
      { name: "Custom music integration", free: true, creator: true, pro: true, enterprise: true },
      { name: "4K video quality", free: false, creator: false, pro: true, enterprise: true },
      { name: "Custom video styles", free: false, creator: false, pro: true, enterprise: true }
    ]
  },
  {
    category: "Processing & Performance",
    items: [
      { name: "Standard processing", free: true, creator: true, pro: true, enterprise: true },
      { name: "Priority processing", free: false, creator: true, pro: true, enterprise: true },
      { name: "Instant processing", free: false, creator: false, pro: false, enterprise: true },
      { name: "Batch processing", free: false, creator: false, pro: true, enterprise: true }
    ]
  },
  {
    category: "Support & Resources",
    items: [
      { name: "Community support", free: true, creator: true, pro: true, enterprise: true },
      { name: "Email support", free: false, creator: true, pro: true, enterprise: true },
      { name: "Priority support", free: false, creator: false, pro: true, enterprise: true },
      { name: "Dedicated support", free: false, creator: false, pro: false, enterprise: true }
    ]
  }
];

const CheckoutForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [planId, setPlanId] = useState<string>('creator');
  const [isLoading, setIsLoading] = useState(false);

  // Get plan from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get('plan');
    if (plan && (plan === 'creator' || plan === 'pro')) {
      setPlanId(plan);
    }
  }, []);

  // Mock Stripe promise
  const stripePromise = loadStripe("pk_test_51SAaoRRpPDjqChm1swlR6XPBgET4MWb6npOo8EghMHHVmSqkA02hxYtY1tv18PE3rk4EHodCXrYn7oofLFxzHxZi00yr53GoWp");

  const fetchClientSecret = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isLoading) {
      return 'mock_client_secret';
    }
    
    setIsLoading(true);
    
    try {
      // For now, always return mock client secret to prevent API calls
      // This prevents the infinite loop and 401 errors
      return 'mock_client_secret';
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const options = { fetchClientSecret };

  return (
    <div className="h-screen overflow-hidden bg-background">
      <div className="h-full flex flex-col">
        {/* Compact Header */}
        <div className="flex-shrink-0 p-4">
          <div className="flex items-center justify-between mb-3">
            <Link href="/" className="inline-flex items-center text-sm group text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-3 h-3" />
                  Dark
                </>
              ) : theme === 'dark' ? (
                <>
                  <Sun className="w-3 h-3" />
                  System
                </>
              ) : (
                <>
                  <Sun className="w-3 h-3" />
                  Light
                </>
              )}
            </button>
          </div>
          
          {/* Compact Demo Notice */}
          <div className="rounded-lg p-2 mb-3 bg-amber-50 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
              <span className="font-medium text-sm text-amber-800 dark:text-amber-200">Demo Mode</span>
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-1 text-foreground">
              Complete Your Subscription
            </h1>
            <p className="text-sm text-muted-foreground">
              Secure checkout powered by Stripe
            </p>
          </div>
        </div>

        {/* Main Content - Takes remaining height */}
        <div className="flex-1 px-4 pb-4">
          <div className="h-full grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Order Summary */}
          <div className="order-2 xl:order-1 flex flex-col">
            <Card className="border-0 shadow-xl backdrop-blur-sm flex-1 flex flex-col bg-card/90 border border-border/50">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-card-foreground">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400 rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-xs">✓</span>
                  </div>
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                {/* Plan Details */}
                <div className="rounded-xl p-4 border flex-shrink-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-blue-100 dark:border-blue-800/50 dark:bg-gradient-to-r dark:from-slate-800/50 dark:to-slate-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {planId === 'creator' ? 'Creator Plan' : 'Pro Plan'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {planId === 'creator' ? '2,000 credits per month' : '6,000 credits per month'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        {planId === 'creator' ? '$19.00' : '$49.00'}
                      </div>
                      <div className="text-xs text-muted-foreground">per month</div>
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-foreground">What's included:</h4>
                    <div className="space-y-1">
                      {planId === 'creator' ? (
                        <>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full"></div>
                            </div>
                            <span className="text-foreground">High quality generation</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full"></div>
                            </div>
                            <span className="text-foreground">Priority processing</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full"></div>
                            </div>
                            <span className="text-foreground">No watermarks</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full"></div>
                            </div>
                            <span className="text-foreground">Ultra high quality</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full"></div>
                            </div>
                            <span className="text-foreground">Highest priority processing</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full"></div>
                            </div>
                            <span className="text-foreground">API access</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="rounded-xl p-4 flex-shrink-0 bg-muted/50 dark:bg-slate-800/60 border border-border/30 dark:border-slate-700/50">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-foreground">Total</span>
                    <div className="text-right">
                      <div className="text-xl font-bold text-foreground">
                        {planId === 'creator' ? '$19.00' : '$49.00'}
                      </div>
                      <div className="text-xs text-muted-foreground">per month</div>
                    </div>
                  </div>
                </div>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 text-xs rounded-lg p-2 flex-shrink-0 text-muted-foreground bg-muted/30 dark:bg-slate-800/40 border border-border/20 dark:border-slate-700/30">
                  <div className="w-4 h-4 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full"></div>
                  </div>
                  <span className="text-foreground">256-bit SSL encryption</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Checkout Form */}
          <div className="order-1 xl:order-2 flex flex-col">
            {isLoading ? (
              <Card className="border-0 shadow-xl backdrop-blur-sm flex-1 flex flex-col bg-card/80">
                <CardContent className="flex-1 flex items-center justify-center p-6">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-sm text-muted-foreground">Loading checkout...</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div id="checkout" className="flex-1">
                <EmbeddedCheckoutProvider
                  stripe={stripePromise}
                  options={options}
                >
                  <EmbeddedCheckout planId={planId} />
                </EmbeddedCheckoutProvider>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<string>('creator');
  const [customAmount, setCustomAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePlanSelect = (planId: string) => {
    if (planId === 'creator' || planId === 'pro') {
      setCheckoutPlan(planId);
      setShowCheckout(true);
    } else {
      setSelectedPlan(planId);
      console.log("Selected plan:", planId);
    }
  };

  const handleCreditsPurchase = async (packageId: string) => {
    const pkg = creditsPackages.find(p => p.id === packageId);
    if (!pkg) return;

    try {
      setIsProcessing(true);
      setSelectedPackage(packageId);

      // Mock purchase - in real app, this would create Stripe checkout
      toast({
        title: "Purchase Initiated",
        description: `Starting purchase of ${pkg.name} for $${pkg.price}`,
      });

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "Purchase Successful!",
        description: `You've received ${(pkg.credits + pkg.bonus).toLocaleString()} credits`,
      });

    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: "Failed to process purchase. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setSelectedPackage(null);
    }
  };

  const handleCustomPurchase = async () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount < 1 || amount > 1000) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter an amount between $1 and $1000",
      });
      return;
    }

    try {
      setIsProcessing(true);

      // Mock custom purchase
      toast({
        title: "Purchase Initiated",
        description: `Starting purchase of $${amount} worth of credits`,
      });

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const credits = Math.floor(amount * 100);
      toast({
        title: "Purchase Successful!",
        description: `You've received ${credits.toLocaleString()} credits`,
      });

      setCustomAmount("");
    } catch (error) {
      console.error('Custom purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: "Failed to process purchase. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (showCheckout) {
    return <CheckoutForm />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 animated-bg"></div>
        <div className="absolute inset-0 hero-gradient"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10"></div>
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-15"
          autoPlay
          loop
          muted
          onLoadedMetadata={(e) => {
            e.currentTarget.currentTime = 9;
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        >
          <source src="/media/hero_section.mp4" type="video/mp4" />
        </video>

        <div className="relative container-custom">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Choose Your
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
                {" "}Creative
              </span>
              <br />
              Journey
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              From free exploration to professional creation, find the perfect plan
              for your video generation needs.
            </p>

            {/* BILLING TOGGLE */}
            <div className="flex items-center justify-center space-x-4 mb-12">
              <span className={`text-sm font-medium ${billingPeriod === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    billingPeriod === "yearly" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${billingPeriod === "yearly" ? "text-foreground" : "text-muted-foreground"}`}>
                Yearly
                <Badge className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Save 20%</Badge>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SUBSCRIPTION PLANS */}
      <div className="container mx-auto px-4 py-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {subscriptionPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${plan.color} ${plan.popular ? 'ring-2 ring-primary scale-105' : ''} transition-all duration-200 hover:shadow-lg`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
                <div className="mt-4">
                  <div className="text-4xl font-bold">
                    {typeof plan.price === "number" ? `$${plan.price}` : plan.price}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {typeof plan.price === "number" ? `per ${plan.period}` : plan.period}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.limitations.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Limitations:</h4>
                    <ul className="space-y-1">
                      {plan.limitations.map((limitation, index) => (
                        <li key={index} className="text-xs text-muted-foreground">
                          • {limitation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  className="w-full mt-6"
                  variant={plan.buttonVariant}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  {plan.buttonText}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CREDITS PACKAGES */}
      <div className="bg-muted/50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Or Buy Credits as You Go
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Need more credits? Purchase them individually without a subscription.
              Perfect for occasional users or when you need extra credits.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {creditsPackages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    pkg.popular ? 'ring-2 ring-primary' : ''
                  } ${pkg.color}`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        <Star className="w-3 h-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardContent className="p-6 text-center">
                    <h3 className="text-xl font-semibold mb-2">{pkg.name}</h3>
                    <p className="text-muted-foreground mb-4">{pkg.description}</p>

                    <div className="mb-4">
                      <div className="text-3xl font-bold">${pkg.price}</div>
                      <div className="text-sm text-muted-foreground">
                        {(pkg.credits + pkg.bonus).toLocaleString()} credits
                        {pkg.bonus > 0 && (
                          <span className="text-green-500 ml-1">
                            (+{pkg.bonus.toLocaleString()} bonus)
                          </span>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-2 mb-6 text-sm">
                      {pkg.features.map((feature, index) => (
                        <li key={index} className="flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button
                      size="lg"
                      className="w-full"
                      onClick={() => handleCreditsPurchase(pkg.id)}
                      disabled={isProcessing && selectedPackage === pkg.id}
                    >
                      {isProcessing && selectedPackage === pkg.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Purchase
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* STRIPE SECURITY BADGE */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 border border-border/20">
              <div className="w-4 h-4 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full"></div>
              </div>
              <span className="text-foreground">Secured by Stripe • SSL Encrypted • 30-day money-back guarantee</span>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE COMPARISON */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Feature Comparison
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Compare all features across our different plans to find the perfect fit for your needs.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium">Features</th>
                <th className="text-center p-4 font-medium">Free</th>
                <th className="text-center p-4 font-medium">Creator</th>
                <th className="text-center p-4 font-medium">Pro</th>
                <th className="text-center p-4 font-medium">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {features.map((category, categoryIndex) => (
                <React.Fragment key={categoryIndex}>
                  <tr className="bg-muted/50">
                    <td colSpan={5} className="p-4 font-medium text-foreground">
                      {category.category}
                    </td>
                  </tr>
                  {category.items.map((item, itemIndex) => (
                    <tr key={itemIndex} className="border-b hover:bg-muted/25">
                      <td className="p-4 text-sm">{item.name}</td>
                      <td className="p-4 text-center">
                        {item.free ? (
                          <Check className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {item.creator ? (
                          <Check className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {item.pro ? (
                          <Check className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {item.enterprise ? (
                          <Check className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* CTA SECTION */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Start Creating?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of creators who are already using clipizy to create
            amazing AI-generated music videos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/pricing">
                <Coins className="w-5 h-5 mr-2" />
                Buy Credits Now
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/dashboard">
                <Video className="w-5 h-5 mr-2" />
                Start Free Trial
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
