"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  Coins,
  Download,
  Plus,
  Minus,
  History,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";
import { toast } from "sonner";

interface CreditsBalance {
  current_balance: number;
  total_earned: number;
  total_spent: number;
}

interface CreditsTransaction {
  id: string;
  amount: number;
  type: "earned" | "spent" | "purchased";
  description: string;
  created_at: string;
  balance_after: number;
}

interface Payment {
  id: string;
  amount_cents: number;
  status: string;
  description: string;
  created_at: string;
  credits_purchased: number;
}

interface BillingInfo {
  plan: string;
  payment_methods: any[];
  billing_address: any;
  next_billing_date: string | null;
  subscription_status: string;
}

export default function BillingPage() {
  const { user } = useAuth();
  const [creditsBalance, setCreditsBalance] = useState<CreditsBalance>({
    current_balance: 0,
    total_earned: 0,
    total_spent: 0
  });
  const [transactions, setTransactions] = useState<CreditsTransaction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    plan: "free",
    payment_methods: [],
    billing_address: null,
    next_billing_date: null,
    subscription_status: "active"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseAmount, setPurchaseAmount] = useState(10);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    setIsLoading(true);
    try {
      // Load credits balance
      const creditsResponse = await fetch('/api/credits/balance');
      if (creditsResponse.ok) {
        const creditsData = await creditsResponse.json();
        setCreditsBalance(creditsData);
      }

      // Load transactions
      const transactionsResponse = await fetch('/api/credits/transactions?limit=20');
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData);
      }

      // Load payment history
      const paymentsResponse = await fetch('/api/payments/history?limit=20');
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        setPayments(paymentsData);
      }

      // Load billing info
      const billingResponse = await fetch('/api/user-management/billing-info');
      if (billingResponse.ok) {
        const billingData = await billingResponse.json();
        if (billingData.success && billingData.billing) {
          setBillingInfo(billingData.billing);
        }
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchaseCredits = async () => {
    try {
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount_dollars: purchaseAmount,
          payment_method_id: null // Will be handled by Stripe
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Handle Stripe payment flow
        toast.success('Payment intent created');
        // Redirect to Stripe checkout or handle payment
      } else {
        throw new Error('Failed to create payment intent');
      }
    } catch (error) {
      console.error('Error purchasing credits:', error);
      toast.error('Failed to purchase credits');
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'spent':
        return <Minus className="w-4 h-4 text-red-500" />;
      case 'purchased':
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      default:
        return <Coins className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Succeeded</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Points & Billing</h1>
          <p className="text-muted-foreground">
            Manage your credits, payments, and subscription
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/profile">
            Back to Settings
          </Link>
        </Button>
      </div>

      {/* CREDITS OVERVIEW */}
      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Coins className="w-5 h-5" />
            <span>Credits Balance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="text-2xl font-bold text-primary">{creditsBalance.current_balance}</div>
              <div className="text-sm text-muted-foreground">Current Balance</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{creditsBalance.total_earned}</div>
              <div className="text-sm text-muted-foreground">Total Earned</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{creditsBalance.total_spent}</div>
              <div className="text-sm text-muted-foreground">Total Spent</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="credits" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="billing">Billing Info</TabsTrigger>
        </TabsList>

        {/* CREDITS TAB */}
        <TabsContent value="credits" className="space-y-6">
          {/* PURCHASE CREDITS */}
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle>Purchase Credits</CardTitle>
              <CardDescription>
                Buy credits to use for video generation and other features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                    min="1"
                    max="1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Credits</Label>
                  <div className="p-2 bg-muted rounded text-center">
                    {purchaseAmount * 100} credits
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Button onClick={handlePurchaseCredits} className="w-full">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Purchase
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TRANSACTION HISTORY */}
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="w-5 h-5" />
                <span>Transaction History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(transaction.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${
                          transaction.type === 'spent' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {transaction.type === 'spent' ? '-' : '+'}{transaction.amount}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Balance: {transaction.balance_after}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYMENTS TAB */}
        <TabsContent value="payments" className="space-y-6">
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Payment History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No payments found
                  </div>
                ) : (
                  payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="w-4 h-4" />
                        <div>
                          <div className="font-medium">{payment.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(payment.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(payment.amount_cents)}</div>
                          <div className="text-sm text-muted-foreground">
                            {payment.credits_purchased} credits
                          </div>
                        </div>
                        {getStatusBadge(payment.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BILLING INFO TAB */}
        <TabsContent value="billing" className="space-y-6">
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Billing Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Plan</Label>
                  <div className="p-2 bg-muted rounded">
                    <Badge className="gradient-primary text-white">{billingInfo.plan}</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subscription Status</Label>
                  <div className="p-2 bg-muted rounded">
                    <Badge variant="secondary">{billingInfo.subscription_status}</Badge>
                  </div>
                </div>
              </div>

              {billingInfo.next_billing_date && (
                <div className="space-y-2">
                  <Label>Next Billing Date</Label>
                  <div className="p-2 bg-muted rounded">
                    {formatDate(billingInfo.next_billing_date)}
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex gap-2">
                <Button variant="outline">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Update Payment Method
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download Invoices
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}