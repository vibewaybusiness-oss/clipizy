"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Sparkles
} from "lucide-react";
import Link from "next/link";

const subscriptionPlans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    description: "Perfect for trying out clipizi",
    features: [
      "100 points per month",
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
      "2,000 points per month",
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
      "6,000 points per month",
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
      "Unlimited points",
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

const pointsPackages = [
  {
    name: "Starter Pack",
    points: 1000,
    price: 10,
    bonus: 0,
    description: "Perfect for trying out clipizi",
    popular: false
  },
  {
    name: "Creator Pack",
    points: 5000,
    price: 40,
    bonus: 1000,
    description: "Most popular choice for creators",
    popular: true
  },
  {
    name: "Pro Pack",
    points: 15000,
    price: 100,
    bonus: 5000,
    description: "For professional content creators",
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

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    // In a real app, you would redirect to checkout or show a modal
    console.log("Selected plan:", planId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* HERO SECTION */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto px-4 py-16">
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
                <Badge className="ml-2 bg-green-100 text-green-800">Save 20%</Badge>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SUBSCRIPTION PLANS */}
      <div className="container mx-auto px-4 py-16">
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

      {/* POINTS PACKAGES */}
      <div className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Or Buy Points as You Go
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Need more points? Purchase them individually without a subscription.
              Perfect for occasional users or when you need extra credits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pointsPackages.map((pkg) => (
              <Card key={pkg.name} className={`${pkg.popular ? 'ring-2 ring-primary' : ''} transition-all duration-200 hover:shadow-lg`}>
                {pkg.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{pkg.name}</CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                  <div className="mt-4">
                    <div className="text-3xl font-bold">${pkg.price}</div>
                    <div className="text-sm text-muted-foreground">
                      {(pkg.points + pkg.bonus).toLocaleString()} points
                      {pkg.bonus > 0 && (
                        <span className="text-green-500 ml-1">
                          (+{pkg.bonus.toLocaleString()} bonus)
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <Button className="w-full" asChild>
                    <Link href="/dashboard/points">
                      Purchase Points
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURE COMPARISON */}
      <div className="container mx-auto px-4 py-16">
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

      {/* FAQ SECTION */}
      <div className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What are points and how do I use them?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Points are credits used to generate videos. Each video generation costs a certain number of points
                  based on length and quality. You can earn points through subscriptions or purchase them individually.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I change my plan anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately,
                  and we'll prorate any billing differences.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What happens to unused points?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Points from subscriptions expire at the end of each billing period.
                  Purchased points never expire and can be used anytime.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Do you offer refunds?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We offer a 30-day money-back guarantee for all subscription plans.
                  For point purchases, refunds are handled on a case-by-case basis.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA SECTION */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Start Creating?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of creators who are already using clipizi to create
            amazing AI-generated music videos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/dashboard/settings/pricing">
                <Coins className="w-5 h-5 mr-2" />
                Buy Points Now
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
