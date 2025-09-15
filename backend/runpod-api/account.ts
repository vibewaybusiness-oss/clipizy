import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { fetchAccountInfo, fetchPods, fetchPodById, RunPodUser, RunPodPod } from './client';

export interface AccountSummary {
  account: RunPodUser | null;
  pods: RunPodPod[];
  totalCost: number;
  activePods: number;
  error?: string;
}

export async function getAccountSummary(): Promise<AccountSummary> {
  try {
    const [accountResult, podsResult] = await Promise.all([
      fetchAccountInfo(),
      fetchPods()
    ]);

    const account = accountResult.success ? accountResult.data || null : null;
    const pods = podsResult.success ? podsResult.data || [] : [];
    
    const activePods = pods.filter(pod => pod.status === 'RUNNING').length;
    const totalCost = pods.reduce((sum, pod) => {
      if (pod.status === 'RUNNING') {
        const hours = pod.uptimeSeconds / 3600;
        return sum + (pod.costPerHr * hours);
      }
      return sum;
    }, 0);

    return {
      account,
      pods,
      totalCost,
      activePods,
      error: accountResult.success && podsResult.success ? undefined : 
        `Account: ${accountResult.error || 'OK'}, Pods: ${podsResult.error || 'OK'}`
    };
  } catch (error) {
    return {
      account: null,
      pods: [],
      totalCost: 0,
      activePods: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getAccountInfo(): Promise<RunPodUser | null> {
  const result = await fetchAccountInfo();
  return result.success ? result.data || null : null;
}

export async function getActivePods(): Promise<RunPodPod[]> {
  const result = await fetchPods();
  if (!result.success) return [];
  return result.data?.filter(pod => pod.status === 'RUNNING') || [];
}

export async function getPodById(podId: string): Promise<RunPodPod | null> {
  const result = await fetchPodById(podId);
  return result.success ? result.data || null : null;
}
