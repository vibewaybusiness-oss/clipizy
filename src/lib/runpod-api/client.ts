import { RunPodConfig, RunPodApiResponse, RunPodPod, NetworkVolume, GpuType } from './types';

const DEFAULT_CONFIG: RunPodConfig = {
  apiKey: process.env.RUNPOD_API_KEY || '',
  graphqlUrl: 'https://api.runpod.io/graphql',
  restUrl: 'https://rest.runpod.io/v1'
};

class RunPodClient {
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

  private async makeRestRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.restUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`REST request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async fetchPods(): Promise<RunPodApiResponse<RunPodPod[]>> {
    try {
      const query = `
        query GetPods {
          myself {
            pods {
              id
              name
              runtime {
                uptimeInSeconds
                ports {
                  ip
                  isIpPublic
                  privatePort
                  publicPort
                  type
                }
                gpus {
                  id
                  gpuUtilPercent
                  memoryUtilPercent
                }
                container {
                  imageName
                  env {
                    key
                    value
                  }
                }
              }
              machineId
              machine {
                podHostId
                name
              }
              desiredStatus
              lastStatusChange
              dockerId
              dockerName
              imageName
              env {
                key
                value
              }
              containerDiskInGb
              volumeInGb
              volumeMountPath
              ports
              gpuIds
              networkVolumeId
              templateId
              idleTimeout
            }
          }
        }
      `;

      const data = await this.makeGraphQLRequest(query);
      return {
        success: true,
        data: data.myself?.pods || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async fetchPodById(podId: string): Promise<RunPodApiResponse<RunPodPod>> {
    try {
      const query = `
        query GetPod($podId: String!) {
          pod(input: { podId: $podId }) {
            id
            name
            runtime {
              uptimeInSeconds
              ports {
                ip
                isIpPublic
                privatePort
                publicPort
                type
              }
              gpus {
                id
                gpuUtilPercent
                memoryUtilPercent
              }
              container {
                imageName
                env {
                  key
                  value
                }
              }
            }
            machineId
            machine {
              podHostId
              name
            }
            desiredStatus
            lastStatusChange
            dockerId
            dockerName
            imageName
            env {
              key
              value
            }
            containerDiskInGb
            volumeInGb
            volumeMountPath
            ports
            gpuIds
            networkVolumeId
            templateId
            idleTimeout
          }
        }
      `;

      const data = await this.makeGraphQLRequest(query, { podId });
      return {
        success: true,
        data: data.pod
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async fetchNetworkVolumes(): Promise<RunPodApiResponse<NetworkVolume[]>> {
    try {
      const query = `
        query GetNetworkVolumes {
          myself {
            networkVolumes {
              id
              name
              size
              used
              region
              dataCenterId
              networkVolumeType
              templateId
              userId
              type
              attachedPods {
                id
                name
              }
            }
          }
        }
      `;

      const data = await this.makeGraphQLRequest(query);
      return {
        success: true,
        data: data.myself?.networkVolumes || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async fetchNetworkVolumeById(volumeId: string): Promise<RunPodApiResponse<NetworkVolume>> {
    try {
      const query = `
        query GetNetworkVolume($volumeId: String!) {
          networkVolume(input: { networkVolumeId: $volumeId }) {
            id
            name
            size
            used
            region
            dataCenterId
            networkVolumeType
            templateId
            userId
            type
            attachedPods {
              id
              name
            }
          }
        }
      `;

      const data = await this.makeGraphQLRequest(query, { volumeId });
      return {
        success: true,
        data: data.networkVolume
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async fetchGpuTypes(): Promise<RunPodApiResponse<GpuType[]>> {
    try {
      const query = `
        query GetGpuTypes {
          gpuTypes {
            id
            displayName
            memoryInGb
            secureCloud
            communityCloud
            lowestPrice {
              minimumBidPrice
              uninterruptablePrice
            }
          }
        }
      `;

      const data = await this.makeGraphQLRequest(query);
      return {
        success: true,
        data: data.gpuTypes || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

const client = new RunPodClient();

export { RunPodClient, client };
export { fetchPods, fetchPodById, fetchNetworkVolumes, fetchNetworkVolumeById, fetchGpuTypes };

async function fetchPods(): Promise<RunPodApiResponse<RunPodPod[]>> {
  return client.fetchPods();
}

async function fetchPodById(podId: string): Promise<RunPodApiResponse<RunPodPod>> {
  return client.fetchPodById(podId);
}

async function fetchNetworkVolumes(): Promise<RunPodApiResponse<NetworkVolume[]>> {
  return client.fetchNetworkVolumes();
}

async function fetchNetworkVolumeById(volumeId: string): Promise<RunPodApiResponse<NetworkVolume>> {
  return client.fetchNetworkVolumeById(volumeId);
}

async function fetchGpuTypes(): Promise<RunPodApiResponse<GpuType[]>> {
  return client.fetchGpuTypes();
}