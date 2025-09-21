import { RunPodConfig, RunPodApiResponse, RestPodConfig, PodRecruitmentConfig, RunPodPod } from './types';

const DEFAULT_CONFIG: RunPodConfig = {
  apiKey: process.env.RUNPOD_API_KEY || '',
  graphqlUrl: 'https://api.runpod.io/graphql',
  restUrl: 'https://rest.runpod.io/v1'
};

class RunPodPodManager {
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

  async recruitPod(config: PodRecruitmentConfig): Promise<RunPodApiResponse<RunPodPod>> {
    try {
      const mutation = `
        mutation CreatePod($input: PodFindAndDeployOnDemandInput!) {
          podFindAndDeployOnDemand(input: $input) {
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

      const input = {
        gpuTypeIds: config.gpuTypeIds,
        imageName: config.imageName,
        name: config.name,
        env: config.env || {},
        containerDiskInGb: config.containerDiskInGb,
        volumeInGb: config.volumeInGb,
        volumeMountPath: config.volumeMountPath,
        networkVolumeId: config.networkVolumeId,
        gpuCount: config.gpuCount || 1,
        minMemoryInGb: config.minMemoryInGb,
        countryCode: config.countryCode,
        supportPublicIp: config.supportPublicIp !== false,
        minVcpuCount: config.minVcpuCount,
        ports: config.ports,
        templateId: config.templateId,
        cloudType: config.cloudType || 'SECURE',
        computeType: config.computeType || 'GPU',
        vcpuCount: config.vcpuCount || 4,
        dataCenterPriority: config.dataCenterPriority || 'availability',
        gpuTypePriority: config.gpuTypePriority || 'availability',
        cpuFlavorPriority: config.cpuFlavorPriority || 'availability',
        minRamPerGpu: config.minRamPerGpu || 8,
        minVcpuPerGpu: config.minVcpuPerGpu || 2,
        interruptible: config.interruptible || false,
        locked: config.locked || false,
        globalNetworking: config.globalNetworking !== false
      };

      const data = await this.makeGraphQLRequest(mutation, { input });
      return {
        success: true,
        data: data.podFindAndDeployOnDemand
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async releasePod(podId: string): Promise<RunPodApiResponse<boolean>> {
    try {
      const mutation = `
        mutation StopPod($input: PodStopInput!) {
          podStop(input: $input) {
            id
            desiredStatus
          }
        }
      `;

      const data = await this.makeGraphQLRequest(mutation, {
        input: { podId }
      });

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getPodStatus(podId: string): Promise<RunPodApiResponse<RunPodPod>> {
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

  async terminatePod(podId: string): Promise<RunPodApiResponse<boolean>> {
    try {
      const mutation = `
        mutation TerminatePod($input: PodTerminateInput!) {
          podTerminate(input: $input) {
            id
            desiredStatus
          }
        }
      `;

      const data = await this.makeGraphQLRequest(mutation, {
        input: { podId }
      });

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async restartPod(podId: string): Promise<RunPodApiResponse<boolean>> {
    try {
      const mutation = `
        mutation RestartPod($input: PodRestartInput!) {
          podRestart(input: $input) {
            id
            desiredStatus
          }
        }
      `;

      const data = await this.makeGraphQLRequest(mutation, {
        input: { podId }
      });

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

const podManager = new RunPodPodManager();

export { RunPodPodManager, podManager };
export { recruitPod, releasePod, getPodStatus, terminatePod, restartPod };

async function recruitPod(config: PodRecruitmentConfig): Promise<RunPodApiResponse<RunPodPod>> {
  return podManager.recruitPod(config);
}

async function releasePod(podId: string): Promise<RunPodApiResponse<boolean>> {
  return podManager.releasePod(podId);
}

async function getPodStatus(podId: string): Promise<RunPodApiResponse<RunPodPod>> {
  return podManager.getPodStatus(podId);
}

async function terminatePod(podId: string): Promise<RunPodApiResponse<boolean>> {
  return podManager.terminatePod(podId);
}

async function restartPod(podId: string): Promise<RunPodApiResponse<boolean>> {
  return podManager.restartPod(podId);
}