import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export interface RunPodUser {
  id: string;
  email: string;
  minBalance: number;
}

export interface RunPodPod {
  id: string;
  name: string;
  imageName: string;
  uptimeSeconds: number;
  costPerHr: number;
  createdAt: string;
  status?: string;
  desiredStatus?: string;
  ip?: string;
  publicIp?: string;
  machineId?: string;
  gpuCount?: number;
  memoryInGb?: number;
  vcpuCount?: number;
  lastStartedAt?: string;
  portMappings?: Record<string, number>;
  networkVolumeId?: string;
  volumeInGb?: number;
  volumeMountPath?: string;
}

export interface RunPodApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RestPodConfig {
  gpuTypeIds: string[];
  imageName: string;
  name: string;
  env?: Record<string, string>;
  containerDiskInGb: number;
  volumeInGb?: number;
  volumeMountPath?: string;
  networkVolumeId?: string;
  ports: string[];
  templateId?: string;
}

export interface NetworkVolume {
  id: string;
  name: string;
  size: number;
  dataCenterId: string;
}

class RunPodGraphQLClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.runpod.io/graphql';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || this.loadApiKey();
  }

  private loadApiKey(): string {
    // First try environment variable
    if (process.env.RUNPOD_API_KEY) {
      console.log('✅ Using RUNPOD_API_KEY from environment variable');
      return process.env.RUNPOD_API_KEY;
    }
    
    // Then try to load from file
    const keyPath = path.resolve(process.cwd(), 'backend', 'runpod_api_key');
    if (fs.existsSync(keyPath)) {
      const keyContent = fs.readFileSync(keyPath, 'utf8').trim();
      // Check if it's an SSH key or API key
      if (keyContent.includes('BEGIN OPENSSH PRIVATE KEY')) {
        throw new Error('SSH key found instead of API key. Please set RUNPOD_API_KEY environment variable or create a file with your RunPod API key.');
      }
      console.log('✅ Using API key from file');
      return keyContent;
    }
    
    throw new Error('RunPod API key not found. Please set RUNPOD_API_KEY environment variable or create a file with your API key in backend directory.');
  }

  private async makeGraphQLRequest<T>(query: string, variables?: any): Promise<RunPodApiResponse<T>> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: variables || {}
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.errors && result.errors.length > 0) {
        return {
          success: false,
          error: result.errors.map((e: any) => e.message).join(', ')
        };
      }

      return {
        success: true,
        data: result.data as T,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async getAccountInfo(): Promise<RunPodApiResponse<RunPodUser>> {
    const query = `
      query {
        myself {
          id
          email
          minBalance
        }
      }
    `;
    
    const result = await this.makeGraphQLRequest<{ myself: RunPodUser }>(query);
    
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.myself
      };
    }
    
    return result;
  }

  async getPods(): Promise<RunPodApiResponse<RunPodPod[]>> {
    // Note: RunPod GraphQL API doesn't seem to support listing all pods
    // This is a limitation of the current API
    return {
      success: false,
      error: 'RunPod GraphQL API does not support listing all pods. Use getPodById() with specific pod IDs instead.'
    };
  }

  async getPodById(podId: string): Promise<RunPodApiResponse<RunPodPod>> {
    const query = `
      query GetPod($id: String!) {
        pod(input: { podId: $id }) {
          id
          name
          imageName
          status
          uptimeSeconds
          costPerHr
          createdAt
        }
      }
    `;
    
    const result = await this.makeGraphQLRequest<{ pod: RunPodPod }>(query, { id: podId });
    
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.pod
      };
    }
    
    return result;
  }

  async createPod(podConfig: {
    name: string;
    imageName: string;
    gpuTypeId: string;
    cloudType: string;
    networkVolumeId?: string;
    gpuCount?: number;
    minMemoryInGb?: number;
    countryCode?: string;
    supportPublicIp?: boolean;
    containerDiskInGb?: number;
    minVcpuCount?: number;
    ports?: string;
    dockerArgs?: string;
    templateId?: string;
  }): Promise<RunPodApiResponse<RunPodPod>> {
    const mutation = `
      mutation CreatePod($input: PodFindAndDeployOnDemandInput!) {
        podFindAndDeployOnDemand(input: $input) {
          id
          name
          imageName
          uptimeSeconds
          costPerHr
          createdAt
        }
      }
    `;
    
    const variables = {
      input: {
        name: podConfig.name,
        imageName: podConfig.imageName,
        gpuTypeId: podConfig.gpuTypeId,
        cloudType: podConfig.cloudType,
        networkVolumeId: podConfig.networkVolumeId,
        gpuCount: podConfig.gpuCount,
        minMemoryInGb: podConfig.minMemoryInGb,
        countryCode: podConfig.countryCode,
        supportPublicIp: podConfig.supportPublicIp,
        containerDiskInGb: podConfig.containerDiskInGb,
        minVcpuCount: podConfig.minVcpuCount,
        ports: podConfig.ports,
        dockerArgs: podConfig.dockerArgs,
        templateId: podConfig.templateId
      }
    };
    
    const result = await this.makeGraphQLRequest<{ podFindAndDeployOnDemand: RunPodPod }>(mutation, variables);
    
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.podFindAndDeployOnDemand
      };
    }
    
    return result;
  }

  async stopPod(podId: string): Promise<RunPodApiResponse<{ success: boolean }>> {
    const mutation = `
      mutation StopPod($input: PodStopInput!) {
        podStop(input: $input) {
          id
          status
        }
      }
    `;
    
    const result = await this.makeGraphQLRequest<{ podStop: { id: string; status: string } }>(mutation, { input: { podId } });
    
    if (result.success && result.data) {
      return {
        success: true,
        data: { success: true }
      };
    }
    
    return result;
  }

  async startPod(podId: string): Promise<RunPodApiResponse<{ success: boolean }>> {
    const mutation = `
      mutation StartPod($input: PodStartInput!) {
        podStart(input: $input) {
          id
          status
        }
      }
    `;
    
    const result = await this.makeGraphQLRequest<{ podStart: { id: string; status: string } }>(mutation, { input: { podId } });
    
    if (result.success && result.data) {
      return {
        success: true,
        data: { success: true }
      };
    }
    
    return result;
  }

  async pausePod(podId: string): Promise<RunPodApiResponse<{ success: boolean }>> {
    const mutation = `
      mutation StopPod($input: PodStopInput!) {
        podStop(input: $input) {
          id
          desiredStatus
        }
      }
    `;
    
    const result = await this.makeGraphQLRequest<{ podStop: { id: string; desiredStatus: string } }>(mutation, { input: { podId } });
    
    if (result.success && result.data) {
      return {
        success: true,
        data: { success: true }
      };
    }
    
    return result;
  }

  async terminatePod(podId: string): Promise<RunPodApiResponse<{ success: boolean }>> {
    // Use REST API for pod deletion as GraphQL doesn't support it
    try {
      const apiKey = process.env.RUNPOD_API_KEY;
      if (!apiKey) {
        return {
          success: false,
          error: 'RUNPOD_API_KEY not found'
        };
      }

      const response = await fetch(`https://rest.runpod.io/v1/pods/${podId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Handle empty response body (common for DELETE requests)
        let result;
        try {
          const text = await response.text();
          result = text ? JSON.parse(text) : {};
        } catch (e) {
          result = {};
        }
        return {
          success: true,
          data: { success: true }
        };
      } else {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP error! status: ${response.status} - ${errorText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Error terminating pod: ${error}`
      };
    }
  }

  async getGpuTypes(): Promise<RunPodApiResponse<any[]>> {
    const query = `
      query {
        gpuTypes {
          id
        }
      }
    `;
    
    const result = await this.makeGraphQLRequest<{ gpuTypes: any[] }>(query);
    
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.gpuTypes
      };
    }
    
    return result;
  }

  async getCloudTypes(): Promise<RunPodApiResponse<any[]>> {
    const query = `
      query {
        cloudStorages {
          id
        }
      }
    `;
    
    const result = await this.makeGraphQLRequest<{ cloudStorages: any[] }>(query);
    
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.cloudStorages
      };
    }
    
    return result;
  }
}

let _runpodGraphQLClient: RunPodGraphQLClient | null = null;

export class RunPodRestClient {
  private apiKey: string;
  private baseUrl: string = 'https://rest.runpod.io/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || this.loadApiKey();
  }

  private loadApiKey(): string {
    if (process.env.RUNPOD_API_KEY) {
      console.log('✅ Using RUNPOD_API_KEY from environment variable');
      return process.env.RUNPOD_API_KEY;
    }
    
    const keyPath = path.resolve(process.cwd(), 'backend', 'runpod_api_key');
    if (fs.existsSync(keyPath)) {
      const keyContent = fs.readFileSync(keyPath, 'utf8').trim();
      if (keyContent.startsWith('rpa_')) {
        console.log('✅ Using API key from file');
        return keyContent;
      }
    }
    
    throw new Error('RunPod API key not found. Set RUNPOD_API_KEY environment variable or create backend/runpod_api_key file');
  }

  private async makeRequest<T>(endpoint: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', data?: any): Promise<RunPodApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP error! status: ${response.status} - ${errorText}`
        };
      }

      const text = await response.text();
      if (!text) {
        return {
          success: true,
          data: {} as T
        };
      }

      try {
        const result = JSON.parse(text);
        return {
          success: true,
          data: result
        };
      } catch (parseError) {
        return {
          success: false,
          error: `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getAccountInfo(): Promise<RunPodApiResponse<RunPodUser>> {
    // Mock response since REST API doesn't have this endpoint
    return {
      success: true,
      data: {
        id: 'mock-user',
        username: 'mock-user',
        email: 'mock@example.com',
        credits: 1000
      }
    };
  }

  async getPods(): Promise<RunPodApiResponse<RunPodPod[]>> {
    const result = await this.makeRequest<RunPodPod[]>('/pods');
    return result;
  }

  async getPodById(podId: string): Promise<RunPodApiResponse<RunPodPod>> {
    const result = await this.makeRequest<any>(`/pods/${podId}`);
    
    if (result.success && result.data) {
      // Map the raw API response to our RunPodPod interface
      const pod: RunPodPod = {
        id: result.data.id,
        name: result.data.name,
        imageName: result.data.imageName,
        uptimeSeconds: result.data.uptimeSeconds || 0, // This field doesn't exist in API, will be calculated
        costPerHr: result.data.costPerHr || 0,
        createdAt: result.data.createdAt,
        status: result.data.desiredStatus || result.data.status, // Use correct field order
        desiredStatus: result.data.desiredStatus,
        ip: result.data.ip,
        publicIp: result.data.publicIp,
        machineId: result.data.machineId,
        gpuCount: result.data.gpuCount,
        memoryInGb: result.data.memoryInGb,
        vcpuCount: result.data.vcpuCount,
        lastStartedAt: result.data.lastStartedAt,
        portMappings: result.data.portMappings,
        networkVolumeId: result.data.networkVolumeId,
        volumeInGb: result.data.volumeInGb,
        volumeMountPath: result.data.volumeMountPath
      };
      
      return {
        success: true,
        data: pod
      };
    }
    
    return result;
  }

  async createPod(podConfig: RestPodConfig): Promise<RunPodApiResponse<RunPodPod>> {
    const result = await this.makeRequest<RunPodPod>('/pods', 'POST', podConfig);
    return result;
  }

  async stopPod(podId: string): Promise<RunPodApiResponse<{ success: boolean }>> {
    const result = await this.makeRequest<{ success: boolean }>(`/pods/${podId}/stop`, 'POST');
    return result;
  }

  async startPod(podId: string): Promise<RunPodApiResponse<{ success: boolean }>> {
    const result = await this.makeRequest<{ success: boolean }>(`/pods/${podId}/start`, 'POST');
    return result;
  }

  async exposeHttpPorts(podId: string, ports: number[]): Promise<RunPodApiResponse<{ success: boolean }>> {
    const result = await this.makeRequest<{ success: boolean }>(`/pods/${podId}`, 'PATCH', {
      exposeHttpPorts: ports
    });
    return result;
  }

  async restartPod(podId: string): Promise<RunPodApiResponse<{ success: boolean }>> {
    const result = await this.makeRequest<{ success: boolean }>(`/pods/${podId}/restart`, 'POST');
    return result;
  }

  async updatePod(podId: string, updateData: any): Promise<RunPodApiResponse<RunPodPod>> {
    const result = await this.makeRequest<RunPodPod>(`/pods/${podId}`, 'PATCH', updateData);
    return result;
  }

  async pausePod(podId: string): Promise<RunPodApiResponse<{ success: boolean }>> {
    // RunPod uses /stop endpoint for pausing
    const result = await this.makeRequest<{ success: boolean }>(`/pods/${podId}/stop`, 'POST');
    return result;
  }

  async terminatePod(podId: string): Promise<RunPodApiResponse<{ success: boolean }>> {
    const result = await this.makeRequest<{ success: boolean }>(`/pods/${podId}`, 'DELETE');
    return result;
  }

  async getGpuTypes(): Promise<RunPodApiResponse<any[]>> {
    // Mock response since REST API doesn't have this endpoint
    return {
      success: true,
      data: [
        { id: 'NVIDIA GeForce RTX 3090', memoryInGb: 24 },
        { id: 'NVIDIA GeForce RTX 4090', memoryInGb: 24 },
        { id: 'NVIDIA A40', memoryInGb: 48 }
      ]
    };
  }

  async getCloudTypes(): Promise<RunPodApiResponse<any[]>> {
    // Mock response since REST API doesn't have this endpoint
    return {
      success: true,
      data: [
        { id: 'COMMUNITY', name: 'Community Cloud' },
        { id: 'SECURE', name: 'Secure Cloud' }
      ]
    };
  }

  async getNetworkVolumes(): Promise<RunPodApiResponse<NetworkVolume[]>> {
    const result = await this.makeRequest<NetworkVolume[]>('/networkvolumes');
    return result;
  }

  async getNetworkVolumeById(volumeId: string): Promise<RunPodApiResponse<NetworkVolume>> {
    const result = await this.makeRequest<NetworkVolume>(`/networkvolumes/${volumeId}`);
    return result;
  }

  async getTemplates(includePublic: boolean = false, includeRunpod: boolean = false, includeEndpointBound: boolean = false): Promise<RunPodApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (includePublic) params.append('includePublicTemplates', 'true');
    if (includeRunpod) params.append('includeRunpodTemplates', 'true');
    if (includeEndpointBound) params.append('includeEndpointBoundTemplates', 'true');
    
    const queryString = params.toString();
    const endpoint = queryString ? `/templates?${queryString}` : '/templates';
    
    const result = await this.makeRequest<any[]>(endpoint);
    return result;
  }

  // Expose makeRequest for testing purposes
  async makeRequestPublic<T>(endpoint: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', data?: any): Promise<RunPodApiResponse<T>> {
    return this.makeRequest<T>(endpoint, method, data);
  }
}

let _runpodRestClient: RunPodRestClient | null = null;

export function getRunpodRestClient(): RunPodRestClient {
  if (!_runpodRestClient) {
    _runpodRestClient = new RunPodRestClient();
  }
  return _runpodRestClient;
}

export function getRunpodGraphQLClient(): RunPodGraphQLClient {
  if (!_runpodGraphQLClient) {
    _runpodGraphQLClient = new RunPodGraphQLClient();
  }
  return _runpodGraphQLClient;
}

export async function fetchAccountInfo(): Promise<RunPodApiResponse<RunPodUser>> {
  return getRunpodGraphQLClient().getAccountInfo();
}

export async function fetchPods(): Promise<RunPodApiResponse<RunPodPod[]>> {
  return getRunpodGraphQLClient().getPods();
}

export async function fetchPodById(podId: string): Promise<RunPodApiResponse<RunPodPod>> {
  return getRunpodGraphQLClient().getPodById(podId);
}

export async function createPod(podConfig: {
  name: string;
  imageName: string;
  gpuTypeId: string;
  cloudType: string;
  networkVolumeId?: string;
}): Promise<RunPodApiResponse<RunPodPod>> {
  return getRunpodGraphQLClient().createPod(podConfig);
}

export async function stopPod(podId: string): Promise<RunPodApiResponse<{ success: boolean }>> {
  return getRunpodGraphQLClient().stopPod(podId);
}

export async function startPod(podId: string): Promise<RunPodApiResponse<{ success: boolean }>> {
  return getRunpodGraphQLClient().startPod(podId);
}

export async function terminatePod(podId: string): Promise<RunPodApiResponse<{ success: boolean }>> {
  return getRunpodGraphQLClient().terminatePod(podId);
}

export async function fetchGpuTypes(): Promise<RunPodApiResponse<any[]>> {
  return getRunpodGraphQLClient().getGpuTypes();
}

export async function fetchCloudTypes(): Promise<RunPodApiResponse<any[]>> {
  return getRunpodGraphQLClient().getCloudTypes();
}

export async function fetchNetworkVolumes(): Promise<RunPodApiResponse<NetworkVolume[]>> {
  return getRunpodRestClient().getNetworkVolumes();
}

export async function fetchNetworkVolumeById(volumeId: string): Promise<RunPodApiResponse<NetworkVolume>> {
  return getRunpodRestClient().getNetworkVolumeById(volumeId);
}
