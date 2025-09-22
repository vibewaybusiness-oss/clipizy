"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Zap, 
  Crown, 
  Star, 
  CheckCircle,
  ArrowRight,
  ExternalLink,
  Calendar,
  Users,
  Settings
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

interface SubscriptionInfo {
  tier: 'free' | 'plus' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  renewsAt: string | null;
  billingCycle: 'monthly' | 'yearly' | null;
  price: number;
  currency: string;
}

interface PointsPackage {
  id: string;
  name: string;
  points: number;
  price: number;
  currency: string;
  popular?: boolean;
  bonus?: number;
  description: string;
  features: string[];
}

interface PointsBalance {
  current: number;
  totalEarned: number;
  totalSpent: number;
}

const subscriptionTiers = {
  free: {
    name: 'Free',
    icon: Star,
    color: 'bg-gray-500',
    description: 'Basic features with limited usage'
  },
  plus: {
    name: 'Plus',
    icon: Zap,
    color: 'bg-blue-500',
    description: 'Enhanced features with more credits'
  },
  pro: {
    name: 'Pro',
    icon: Crown,
    color: 'bg-purple-500',
    description: 'Professional features and priority support'
  },
  enterprise: {
    name: 'Enterprise',
    icon: Settings,
    color: 'bg-gold-500',
    description: 'Custom solutions for large teams'
  }
};

const pointsPackages: PointsPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    points: 1000,
    price: 9.99,
    currency: 'USD',
    description: 'Perfect for getting started',
    features: ['1000 credits', 'Basic support', 'Standard quality']
  },
  {
    id: 'creator',
    name: 'Creator Pack',
    points: 5000,
    price: 39.99,
    currency: 'USD',
    popular: true,
    bonus: 500,
    description: 'Most popular choice for creators',
    features: ['5000 credits', '500 bonus credits', 'Priority support', 'HD quality']
  },
  {
    id: 'professional',
    name: 'Professional Pack',
    points: 15000,
    price: 99.99,
    currency: 'USD',
    bonus: 2000,
    description: 'For professional content creators',
    features: ['15000 credits', '2000 bonus credits', 'Priority support', '4K quality', 'Advanced features']
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pack',
    points: 50000,
    price: 299.99,
    currency: 'USD',
    bonus: 10000,
    description: 'For teams and agencies',
    features: ['50000 credits', '10000 bonus credits', 'Dedicated support', '4K quality', 'All features', 'Team management']
  }
];

export default function SubscriptionPointsTab() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    tier: 'free',
    status: 'active',
    renewsAt: null,
    billingCycle: null,
    price: 0,
    currency: 'USD'
  });
  const [pointsBalance, setPointsBalance] = useState<PointsBalance>({
    current: 0,
    totalEarned: 0,
    totalSpent: 0
  });

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    setIsLoading(true);
    try {
      // Load subscription info
      const subscriptionResponse = await fetch('/api/user-management/subscription');
      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        if (subscriptionData.success) {
          setSubscriptionInfo(subscriptionData.subscription);
        }
      }

      // Load points balance
      const pointsResponse = await fetch('/api/credits/balance');
      if (pointsResponse.ok) {
        const pointsData = await pointsResponse.json();
        setPointsBalance(pointsData);
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast.error('Failed to load subscription information');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchasePoints = async (packageId: string) => {
    try {
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          package_id: packageId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Handle payment flow
        toast.success('Redirecting to payment...');
        // Redirect to Stripe checkout or handle payment
      } else {
        throw new Error('Failed to initiate purchase');
      }
    } catch (error) {
      console.error('Error purchasing points:', error);
      toast.error('Failed to purchase points');
    }
  };

  const handleManageSubscription = () => {
    // Redirect to subscription management page
    window.open('/dashboard/subscription/manage', '_blank');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'past_due':
        return <Badge className="bg-red-100 text-red-800">Past Due</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const currentTier = subscriptionTiers[subscriptionInfo.tier];
  const TierIcon = currentTier.icon;

  return (
    <div className="space-y-6">
      {/* SUBSCRIPTION OVERVIEW */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Current Subscription
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${currentTier.color}`}>
                <TierIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{currentTier.name} Plan</h3>
                <p className="text-sm text-muted-foreground">{currentTier.description}</p>
              </div>
            </div>
            <div className="text-right">
              {getStatusBadge(subscriptionInfo.status)}
              {subscriptionInfo.price > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  ${subscriptionInfo.price}/{subscriptionInfo.billingCycle === 'yearly' ? 'year' : 'month'}
                </p>
              )}
            </div>
          </div>

          {subscriptionInfo.renewsAt && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Renews: {formatDate(subscriptionInfo.renewsAt)}</span>
            </div>
          )}

          <Separator />

          <div className="flex gap-3">
            <Button onClick={handleManageSubscription} className="flex-1">
              <Settings className="w-4 h-4 mr-2" />
              Manage Subscription
            </Button>
            {subscriptionInfo.tier === 'free' && (
              <Button variant="outline" className="flex-1" asChild>
                <a href="/pricing" target="_blank" rel="noopener noreferrer">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Plan
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* POINTS BALANCE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Points Balance
          </CardTitle>
          <CardDescription>
            Your current points and usage statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="text-3xl font-bold text-primary">{pointsBalance.current.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Current Balance</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{pointsBalance.totalEarned.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Earned</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="text-3xl font-bold text-red-600">{pointsBalance.totalSpent.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Spent</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* POINTS PACKAGES */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Buy Points
          </CardTitle>
          <CardDescription>
            Purchase points packages to fuel your creativity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pointsPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative border rounded-lg p-4 space-y-3 ${
                  pkg.popular ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="font-semibold text-lg">{pkg.name}</h3>
                  <div className="text-2xl font-bold text-primary">
                    {pkg.points.toLocaleString()}
                    {pkg.bonus && (
                      <span className="text-sm text-green-600 ml-1">
                        +{pkg.bonus.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">credits</div>
                  <div className="text-lg font-semibold">
                    ${pkg.price}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground text-center">
                    {pkg.description}
                  </p>
                  <ul className="text-xs space-y-1">
                    {pkg.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => handlePurchasePoints(pkg.id)}
                  className="w-full"
                  variant={pkg.popular ? "default" : "outline"}
                >
                  Purchase
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* USAGE STATISTICS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Usage Statistics
          </CardTitle>
          <CardDescription>
            Track your points usage and activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Usage statistics coming soon</p>
            <p className="text-sm">Track your points usage and get insights into your activity</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
