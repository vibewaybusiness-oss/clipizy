import { useState, useEffect, useCallback } from 'react';
import { pointsAPI, PointsBalance, PointsTransaction, PointsSpendRequest, PointsPurchaseRequest, PaymentIntentResponse } from '@/lib/api/points';
import { useToast } from '@/hooks/use-toast';

export function usePoints() {
  const [balance, setBalance] = useState<PointsBalance | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await pointsAPI.getBalance();
      setBalance(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch points balance';
      setError(errorMessage);
      console.error('Error fetching points balance:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async (limit: number = 50) => {
    try {
      setError(null);
      const data = await pointsAPI.getTransactions(limit);
      setTransactions(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transactions';
      setError(errorMessage);
      console.error('Error fetching transactions:', err);
    }
  }, []);

  const spendPoints = useCallback(async (spendRequest: PointsSpendRequest) => {
    try {
      setError(null);
      const result = await pointsAPI.spendPoints(spendRequest);

      // Refresh balance after spending
      await fetchBalance();

      toast({
        title: "Points Spent",
        description: `Successfully spent ${spendRequest.amount} points`,
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to spend points';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Spend Failed",
        description: errorMessage,
      });
      throw err;
    }
  }, [fetchBalance, toast]);

  const purchasePoints = useCallback(async (purchaseRequest: PointsPurchaseRequest): Promise<PaymentIntentResponse> => {
    try {
      setError(null);
      const result = await pointsAPI.purchasePoints(purchaseRequest);

      toast({
        title: "Payment Intent Created",
        description: "Please complete the payment to add points to your account",
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create payment intent';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Purchase Failed",
        description: errorMessage,
      });
      throw err;
    }
  }, [toast]);

  const canAfford = useCallback(async (amount: number) => {
    try {
      const result = await pointsAPI.canAfford(amount);
      return result;
    } catch (err) {
      console.error('Error checking affordability:', err);
      return { can_afford: false, amount_requested: amount, current_balance: 0 };
    }
  }, []);

  // Load initial data
  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, [fetchBalance, fetchTransactions]);

  return {
    balance,
    transactions,
    loading,
    error,
    fetchBalance,
    fetchTransactions,
    spendPoints,
    purchasePoints,
    canAfford,
  };
}
