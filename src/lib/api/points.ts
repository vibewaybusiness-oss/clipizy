// Points API utilities
export interface PointsBalance {
  current_balance: number;
  total_earned: number;
  total_spent: number;
  recent_transactions: PointsTransaction[];
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  transaction_type: 'earned' | 'spent' | 'purchased' | 'refunded' | 'bonus' | 'admin_adjustment';
  amount: number;
  balance_after: number;
  description?: string;
  reference_id?: string;
  reference_type?: string;
  created_at: string;
}

export interface PointsSpendRequest {
  amount: number;
  description: string;
  reference_id?: string;
  reference_type?: string;
}

export interface PointsPurchaseRequest {
  amount_dollars: number;
  payment_method_id?: string;
}

export class PointsAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '';
  }

  async getBalance(): Promise<PointsBalance> {
    try {
      const response = await fetch('/api/points/balance', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch points balance: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching points balance:', error);
      throw error;
    }
  }

  async getTransactions(limit: number = 50): Promise<PointsTransaction[]> {
    try {
      const response = await fetch(`/api/points/transactions?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  async spendPoints(spendRequest: PointsSpendRequest): Promise<{ message: string; transaction_id: string; new_balance: number }> {
    try {
      const response = await fetch('/api/points/spend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(spendRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to spend points: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error spending points:', error);
      throw error;
    }
  }

  async purchasePoints(purchaseRequest: PointsPurchaseRequest): Promise<PaymentIntentResponse> {
    try {
      const response = await fetch('/api/points/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(purchaseRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to create payment intent: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error purchasing points:', error);
      throw error;
    }
  }

  async canAfford(amount: number): Promise<{ can_afford: boolean; amount_requested: number; current_balance: number }> {
    try {
      const response = await fetch(`/api/points/can-afford/${amount}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to check affordability: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking affordability:', error);
      throw error;
    }
  }
}

export interface PaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
  amount_cents: number;
  points_purchased: number;
  status: string;
}

export const pointsAPI = new PointsAPI();
