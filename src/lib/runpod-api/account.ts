import { fetchAccountInfo, fetchPods, RunPodUser, RunPodPod, RunPodApiResponse } from './client';

export interface AccountSummary {
  account?: RunPodUser;
  activePods: number;
  totalCost: number;
  pods: RunPodPod[];
}

export async function getAccountInfo(): Promise<RunPodUser | null> {
  try {
    const result = await fetchAccountInfo();
    if (result.success && result.data) {
      return result.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching account info:', error);
    return null;
  }
}

export async function getAccountSummary(): Promise<AccountSummary> {
  try {
    const accountResult = await fetchAccountInfo();
    const podsResult = await fetchPods();
    
    const account = accountResult.success ? accountResult.data : undefined;
    const pods = podsResult.success ? podsResult.data || [] : [];
    
    const activePods = pods.filter(pod => 
      pod.status === 'RUNNING' || pod.desiredStatus === 'RUNNING'
    ).length;
    
    const totalCost = pods.reduce((sum, pod) => {
      if (pod.costPerHr && pod.uptimeSeconds) {
        const hours = pod.uptimeSeconds / 3600;
        return sum + (pod.costPerHr * hours);
      }
      return sum;
    }, 0);
    
    return {
      account,
      activePods,
      totalCost: Math.round(totalCost * 100) / 100,
      pods
    };
  } catch (error) {
    console.error('Error fetching account summary:', error);
    return {
      activePods: 0,
      totalCost: 0,
      pods: []
    };
  }
}

export async function getActivePods(): Promise<RunPodPod[]> {
  try {
    const result = await fetchPods();
    if (result.success && result.data) {
      return result.data.filter(pod => 
        pod.status === 'RUNNING' || pod.desiredStatus === 'RUNNING'
      );
    }
    return [];
  } catch (error) {
    console.error('Error fetching active pods:', error);
    return [];
  }
}
