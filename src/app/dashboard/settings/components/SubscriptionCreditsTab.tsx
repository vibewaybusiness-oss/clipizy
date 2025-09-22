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
  ExternalLink,
  Calendar,
  Users,
  Settings
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/ui/use-toast";
import { getBackendUrl } from "@/lib/config";

interface SubscriptionInfo {
  tier: 'free' | 'plus' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  renewsAt: string | null;
  billingCycle: 'monthly' | 'yearly' | null;
  price: number;
  currency: string;
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


export default function SubscriptionCreditsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    tier: 'free',
    status: 'active',
    renewsAt: null,
    billingCycle: null,
    price: 0,
    currency: 'USD'
  });

  useEffect(() => {
    loadSubscriptionData();

    const handleBeforeUnload = () => {
      saveToDatabase();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Empty dependency array to run only once

  const loadSubscriptionData = async () => {
    setIsLoading(true);
    try {
      // Load from localStorage first
      const savedSubscriptionInfo = localStorage.getItem('subscriptionInfo');
      if (savedSubscriptionInfo) {
        setSubscriptionInfo(JSON.parse(savedSubscriptionInfo));
      }

      // Load subscription info from backend
      const subscriptionResponse = await fetch(`${getBackendUrl()}/user-management/subscription`);
      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        if (subscriptionData.success) {
          setSubscriptionInfo(subscriptionData.subscription);
          localStorage.setItem('subscriptionInfo', JSON.stringify(subscriptionData.subscription));
        }
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription information",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveToDatabase = async () => {
    try {
      await fetch(`${getBackendUrl()}/user-management/subscription`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionInfo),
      });
    } catch (error) {
      console.error('Error saving subscription info to database:', error);
    }
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
    <div className="space-y-6 h-full flex flex-col">
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

        </CardContent>
      </Card>


      {/* SUBSCRIPTION MANAGEMENT */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Subscription Management
          </CardTitle>
          <CardDescription>
            Manage your subscription and upgrade your plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* CURRENT PLAN DISPLAY */}
          <div className="mb-6 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${currentTier.color}`}>
                  <TierIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">{currentTier.name} Plan</h3>
                  <p className="text-sm text-muted-foreground">{currentTier.description}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={subscriptionInfo.tier === 'free' ? 'secondary' : 'default'}>
                  {subscriptionInfo.tier === 'free' ? 'Free' : 'Active'}
                </Badge>
                {subscriptionInfo.price > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ${subscriptionInfo.price}/{subscriptionInfo.billingCycle === 'yearly' ? 'year' : 'month'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              className="flex-1 h-12 text-base font-medium gradient-primary text-white"
              asChild
            >
              <a href="/dashboard/settings/subscription" target="_blank" rel="noopener noreferrer">
                <Crown className="w-5 h-5 mr-2" />
                Upgrade Plan
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 h-12 text-base font-medium"
              asChild
            >
              <a href="/dashboard/settings/subscription" target="_blank" rel="noopener noreferrer">
                <Settings className="w-5 h-5 mr-2" />
                Manage Subscription
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* USAGE STATISTICS */}
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Usage Statistics
          </CardTitle>
          <CardDescription>
            Track your credits usage and activity
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Usage statistics coming soon</p>
            <p className="text-sm">Track your credits usage and get insights into your activity</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
