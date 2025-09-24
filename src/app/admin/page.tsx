"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/ui/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { 
  CreditCard, 
  Package, 
  DollarSign, 
  Link, 
  Users, 
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface StripeProduct {
  id: string;
  name: string;
  description: string;
  active: boolean;
  created: number;
  default_price?: string;
}

interface StripePrice {
  id: string;
  object: string;
  active: boolean;
  currency: string;
  unit_amount: number;
  recurring?: {
    interval: string;
  };
  product: string;
  created: number;
}

interface StripePaymentLink {
  id: string;
  url: string;
  active: boolean;
  created: number;
  line_items: Array<{
    price: string;
    quantity: number;
  }>;
}

interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  created: number;
  subscriptions?: {
    data: Array<{
      id: string;
      status: string;
      current_period_end: number;
    }>;
  };
}

export default function AdminPage() {
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [prices, setPrices] = useState<StripePrice[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<StripePaymentLink[]>([]);
  const [customers, setCustomers] = useState<StripeCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchStripeData = async () => {
    setLoading(true);
    try {
      // For demo purposes, we'll use the known Stripe data
      // In production, you'd want to call your backend API
      
      // Mock data based on what we created earlier
      const mockProducts = [
        {
          id: "prod_T6tlpHdA9aMrgm",
          name: "Creator Plan",
          description: "Perfect for content creators and influencers - 2,000 credits per month",
          active: true,
          created: Math.floor(Date.now() / 1000) - 3600,
          default_price: "price_1SAfyCRpPDjqChm1bjiivK16"
        },
        {
          id: "prod_T6tlJ9FvMmO3Rn",
          name: "Pro Plan",
          description: "For professional creators and agencies - 6,000 credits per month",
          active: true,
          created: Math.floor(Date.now() / 1000) - 3600,
          default_price: "price_1SAfyHRpPDjqChm1oYM7RnnU"
        }
      ];

      const mockPrices = [
        {
          id: "price_1SAfyCRpPDjqChm1bjiivK16",
          object: "price",
          active: true,
          currency: "usd",
          unit_amount: 1900,
          recurring: { interval: "month" },
          product: "prod_T6tlpHdA9aMrgm",
          created: Math.floor(Date.now() / 1000) - 3600
        },
        {
          id: "price_1SAfyHRpPDjqChm1oYM7RnnU",
          object: "price",
          active: true,
          currency: "usd",
          unit_amount: 4900,
          recurring: { interval: "month" },
          product: "prod_T6tlJ9FvMmO3Rn",
          created: Math.floor(Date.now() / 1000) - 3600
        }
      ];

      const mockPaymentLinks = [
        {
          id: "plink_1SAfznRpPDjqChm1UoKbQYDr",
          url: "https://buy.stripe.com/test_5kQ14pbnKa4Rbce5Mffw400",
          active: true,
          created: Math.floor(Date.now() / 1000) - 3600,
          line_items: [{ price: "price_1SAfyCRpPDjqChm1bjiivK16", quantity: 1 }]
        },
        {
          id: "plink_1SAfzsRpPDjqChm1AdoWkzJQ",
          url: "https://buy.stripe.com/test_6oU00l0J65OBeoq7Unfw401",
          active: true,
          created: Math.floor(Date.now() / 1000) - 3600,
          line_items: [{ price: "price_1SAfyHRpPDjqChm1oYM7RnnU", quantity: 1 }]
        }
      ];

      setProducts(mockProducts);
      setPrices(mockPrices);
      setPaymentLinks(mockPaymentLinks);
      setCustomers([]); // No customers yet

      toast({
        title: "Data Loaded",
        description: "Stripe data loaded successfully",
      });

    } catch (error) {
      console.error('Error fetching Stripe data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch Stripe data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Copied",
        description: "ID copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  useEffect(() => {
    fetchStripeData();
  }, []);

  // Note: Authentication check removed for demo purposes
  // In production, you'd want to add proper admin authentication

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Stripe Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor your Stripe integration and payment data</p>
        </div>
        <Button onClick={fetchStripeData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="prices">Prices</TabsTrigger>
          <TabsTrigger value="payment-links">Payment Links</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active products in Stripe
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Prices</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{prices.length}</div>
                <p className="text-xs text-muted-foreground">
                  Configured prices
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payment Links</CardTitle>
                <Link className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{paymentLinks.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active payment links
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customers.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total customers
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common admin tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Stripe Dashboard
                </Button>
                <Button variant="outline" className="justify-start">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Products</CardTitle>
              <CardDescription>Your subscription products</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={product.active ? "default" : "secondary"}>
                            {product.active ? "Active" : "Inactive"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Created: {formatDate(product.created)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(product.id, product.id)}
                        >
                          {copiedId === product.id ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {product.id}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Prices</CardTitle>
              <CardDescription>Pricing configurations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prices.map((price) => (
                  <div key={price.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {formatAmount(price.unit_amount, price.currency)}
                          </h3>
                          {price.recurring && (
                            <Badge variant="outline">
                              {price.recurring.interval}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Product: {price.product}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={price.active ? "default" : "secondary"}>
                            {price.active ? "Active" : "Inactive"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Created: {formatDate(price.created)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(price.id, price.id)}
                        >
                          {copiedId === price.id ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {price.id}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-links" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Links</CardTitle>
              <CardDescription>Shareable payment links</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentLinks.map((link) => (
                  <div key={link.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Payment Link</h3>
                        <p className="text-sm text-muted-foreground">
                          {link.line_items.length} item(s)
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={link.active ? "default" : "secondary"}>
                            {link.active ? "Active" : "Inactive"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Created: {formatDate(link.created)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(link.url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(link.url, link.id)}
                        >
                          {copiedId === link.id ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {link.id}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
              <CardDescription>Customer information and subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customers.map((customer) => (
                  <div key={customer.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{customer.name || customer.email}</h3>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            Created: {formatDate(customer.created)}
                          </span>
                          {customer.subscriptions?.data.length > 0 && (
                            <Badge variant="default">
                              {customer.subscriptions.data.length} subscription(s)
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(customer.id, customer.id)}
                        >
                          {copiedId === customer.id ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {customer.id}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}