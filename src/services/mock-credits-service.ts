/**
 * Mock Credits Service - Provides mock data when backend is unavailable
 */

export interface CreditsBalance {
  balance: number;
  plan: string;
  plan_credits: number;
  used_credits: number;
  remaining_credits: number;
}

export interface CreditsTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  date: string;
  balance_after: number;
}

export interface SubscriptionData {
  plan: string;
  status: string;
  next_billing_date?: string;
  cancel_at_period_end: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

class MockCreditsService {
  private mockUserData = {
    balance: 100,
    plan: "free",
    plan_credits: 100,
    used_credits: 0,
    remaining_credits: 100,
    transactions: [
      {
        id: "mock-transaction-1",
        amount: 100,
        type: "initial_credits",
        description: "Welcome bonus - Initial credits for new account",
        date: new Date().toISOString(),
        balance_after: 100
      }
    ],
    subscription: {
      plan: "free",
      status: "active",
      next_billing_date: null,
      cancel_at_period_end: false,
      stripe_customer_id: null,
      stripe_subscription_id: null
    }
  };

  async getBalance(): Promise<CreditsBalance> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      balance: this.mockUserData.balance,
      plan: this.mockUserData.plan,
      plan_credits: this.mockUserData.plan_credits,
      used_credits: this.mockUserData.used_credits,
      remaining_credits: this.mockUserData.remaining_credits
    };
  }

  async getTransactions(): Promise<CreditsTransaction[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return this.mockUserData.transactions;
  }

  async getSubscription(): Promise<SubscriptionData> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return this.mockUserData.subscription;
  }

  async getUsage(): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      projects_created: 0,
      storage_used_mb: 0,
      api_calls_made: 0,
      credits_used: 0
    };
  }

  // Method to simulate credit usage
  async useCredits(amount: number, description: string): Promise<CreditsTransaction> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newBalance = this.mockUserData.balance - amount;
    const transaction: CreditsTransaction = {
      id: `mock-transaction-${Date.now()}`,
      amount: -amount,
      type: "usage",
      description,
      date: new Date().toISOString(),
      balance_after: newBalance
    };
    
    this.mockUserData.balance = newBalance;
    this.mockUserData.used_credits += amount;
    this.mockUserData.remaining_credits = this.mockUserData.plan_credits - this.mockUserData.used_credits;
    this.mockUserData.transactions.unshift(transaction);
    
    return transaction;
  }

  // Method to simulate adding credits
  async addCredits(amount: number, description: string): Promise<CreditsTransaction> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newBalance = this.mockUserData.balance + amount;
    const transaction: CreditsTransaction = {
      id: `mock-transaction-${Date.now()}`,
      amount,
      type: "purchase",
      description,
      date: new Date().toISOString(),
      balance_after: newBalance
    };
    
    this.mockUserData.balance = newBalance;
    this.mockUserData.transactions.unshift(transaction);
    
    return transaction;
  }

  // Method to simulate plan upgrade
  async upgradePlan(plan: string): Promise<SubscriptionData> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const planCredits = {
      free: 100,
      creator: 2000,
      pro: 6000,
      enterprise: 20000
    };
    
    this.mockUserData.plan = plan;
    this.mockUserData.plan_credits = planCredits[plan as keyof typeof planCredits] || 100;
    this.mockUserData.subscription.plan = plan;
    this.mockUserData.subscription.status = "active";
    
    return this.mockUserData.subscription;
  }
}

export const mockCreditsService = new MockCreditsService();
