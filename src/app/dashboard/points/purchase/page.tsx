"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Coins,
  Plus,
  ArrowLeft,
  Loader2,
  Check,
  TrendingUp,
  Zap,
  Star
} from "lucide-react";
import { usePoints } from "@/hooks/use-points";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

const pointsPackages = [
  {
    id: "starter",
    name: "Starter Pack",
    points: 1000,
    price: 10,
    bonus: 0,
    popular: false,
    description: "Perfect for trying out clipizi",
    features: ["1,000 points", "Basic video generation", "Standard quality"],
    color: "border-gray-200"
  },
  {
    id: "creator",
    name: "Creator Pack",
    points: 5000,
    price: 40,
    bonus: 1000,
    popular: true,
    description: "Most popular choice for creators",
    features: ["5,000 points", "1,000 bonus points", "High quality generation", "Priority processing"],
    color: "border-blue-200"
  },
  {
    id: "pro",
    name: "Pro Pack",
    points: 15000,
    price: 100,
    bonus: 5000,
    popular: false,
    description: "For professional content creators",
    features: ["15,000 points", "5,000 bonus points", "Ultra high quality", "Priority processing", "Advanced features"],
    color: "border-purple-200"
  }
];

export default function PurchasePage() {
  const { balance, purchasePoints } = usePoints();
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async (packageId: string) => {
    const pkg = pointsPackages.find(p => p.id === packageId);
    if (!pkg) return;

    try {
      setIsProcessing(true);
      setSelectedPackage(packageId);

      const result = await purchasePoints({
        amount_dollars: pkg.price
      });

      toast({
        title: "Payment Intent Created",
        description: `Please complete payment to add ${pkg.points + pkg.bonus} points to your account`,
      });

    } catch (error) {
      console.error('Purchase error:', error);
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

      const result = await purchasePoints({
        amount_dollars: amount
      });

      toast({
        title: "Payment Intent Created",
        description: `Please complete payment to add ${Math.floor(amount * 100)} points to your account`,
      });

      setCustomAmount("");
    } catch (error) {
      console.error('Custom purchase error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/points">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Points
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Purchase Points</h1>
            <p className="text-muted-foreground text-lg">
              Choose a package or enter a custom amount to buy points
            </p>
          </div>
        </div>
      </div>

      {/* CURRENT BALANCE */}
      <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/20 rounded-full">
                <Coins className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Current Balance</h2>
                <div className="text-3xl font-bold text-primary">
                  {balance?.current_balance?.toLocaleString() || 0} Points
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>Total Earned: {balance?.total_earned?.toLocaleString() || 0}</div>
              <div>Total Spent: {balance?.total_spent?.toLocaleString() || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* POINTS PACKAGES */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-6">Point Packages</h2>

            <div className="space-y-4">
              {pointsPackages.map((pkg) => (
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

                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{pkg.name}</h3>
                        <p className="text-muted-foreground mb-4">{pkg.description}</p>

                        <div className="flex items-center space-x-4 mb-4">
                          <div>
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
                        </div>

                        <ul className="space-y-2 mb-4">
                          {pkg.features.map((feature, index) => (
                            <li key={index} className="flex items-center text-sm">
                              <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Button
                        size="lg"
                        className="ml-4"
                        onClick={() => handlePurchase(pkg.id)}
                        disabled={isProcessing && selectedPackage === pkg.id}
                      >
                        {isProcessing && selectedPackage === pkg.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Purchase
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* CUSTOM AMOUNT & INFO */}
        <div className="space-y-6">
          {/* CUSTOM AMOUNT */}
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Custom Amount</span>
              </CardTitle>
              <CardDescription>
                Purchase any amount of points (100 points per $1)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-amount">Amount ($)</Label>
                <Input
                  id="custom-amount"
                  type="number"
                  min="1"
                  max="1000"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="text-lg"
                />
              </div>

              {customAmount && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">You'll receive:</div>
                  <div className="text-2xl font-bold text-primary">
                    {Math.floor(parseFloat(customAmount) * 100).toLocaleString()} points
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleCustomPurchase}
                disabled={isProcessing || !customAmount}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Purchase Custom Amount
              </Button>
            </CardContent>
          </Card>

          {/* POINTS INFO */}
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Coins className="w-5 h-5" />
                <span>How Points Work</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium">Video Generation</div>
                    <div className="text-sm text-muted-foreground">50-500 points per video depending on length and quality</div>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium">Priority Processing</div>
                    <div className="text-sm text-muted-foreground">Faster generation times for Creator and Pro packages</div>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium">Points Never Expire</div>
                    <div className="text-sm text-muted-foreground">Purchased points are yours forever</div>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium">Bonus Points</div>
                    <div className="text-sm text-muted-foreground">Get extra points with larger packages</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PAYMENT METHODS */}
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Check className="w-5 h-5" />
                <span>Secure Payment</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Powered by Stripe</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>SSL Encrypted</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>30-day money-back guarantee</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Instant point delivery</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
