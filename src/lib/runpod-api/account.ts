import { RunPodConfig, RunPodApiResponse, RunPodUser, RunPodAccount, RunPodAccountSummary } from './types';

const DEFAULT_CONFIG: RunPodConfig = {
  apiKey: process.env.RUNPOD_API_KEY || '',
  graphqlUrl: 'https://api.runpod.io/graphql',
  restUrl: 'https://rest.runpod.io/v1'
};

class RunPodAccountClient {
  private config: RunPodConfig;

  constructor(config?: Partial<RunPodConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private async makeGraphQLRequest(query: string, variables?: any): Promise<any> {
    const response = await fetch(this.config.graphqlUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        variables: variables || {}
      })
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
  }

  async getAccountInfo(): Promise<RunPodApiResponse<RunPodUser>> {
    try {
      const query = `
        query GetAccountInfo {
          myself {
            id
            email
            minBalance
            balance
          }
        }
      `;

      const data = await this.makeGraphQLRequest(query);
      return {
        success: true,
        data: data.myself
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAccountSummary(): Promise<RunPodApiResponse<RunPodAccountSummary>> {
    try {
      const query = `
        query GetAccountSummary {
          myself {
            id
            email
            minBalance
            balance
            credits
            totalSpent
            pods {
              id
              name
              desiredStatus
              runtime {
                uptimeInSeconds
              }
            }
          }
        }
      `;

      const data = await this.makeGraphQLRequest(query);
      const account = data.myself;

      const activePods = account.pods?.filter((pod: any) =>
        pod.desiredStatus === 'RUNNING' && pod.runtime?.uptimeInSeconds > 0
      ).length || 0;

      const totalCost = account.totalSpent || 0;
      const monthlySpend = totalCost; // This would need to be calculated based on billing period

      const summary: RunPodAccountSummary = {
        account: {
          id: account.id,
          email: account.email,
          minBalance: account.minBalance,
          balance: account.balance,
          credits: account.credits || 0,
          totalSpent: account.totalSpent || 0
        },
        activePods,
        totalCost,
        monthlySpend
      };

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

const accountClient = new RunPodAccountClient();

export { RunPodAccountClient, accountClient };
export { getAccountInfo, getAccountSummary };

async function getAccountInfo(): Promise<RunPodApiResponse<RunPodUser>> {
  return accountClient.getAccountInfo();
}

async function getAccountSummary(): Promise<RunPodApiResponse<RunPodAccountSummary>> {
  return accountClient.getAccountSummary();
}