import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { getRunpodRestClient, RunPodPod, RunPodApiResponse, RestPodConfig, NetworkVolume } from './client';

export interface PodRecruitmentConfig {
  name: string;
  imageName: string;
  cloudType?: 'SECURE' | 'COMMUNITY' | 'ALL';
  networkVolumeId?: string;
  maxRetries?: number;
  retryDelay?: number;
  gpuCount?: number;
  minMemoryInGb?: number;
  countryCode?: string;
  supportPublicIp?: boolean;
  containerDiskInGb?: number;
  minVcpuCount?: number;
  ports?: string;
  dockerArgs?: string;
  templateId?: string;
  workflowName?: string;
}

export interface PodRecruitmentResult {
  success: boolean;
  pod?: RunPodPod;
  error?: string;
  gpuType?: string;
  attempts?: number;
}

export interface PodReleaseResult {
  success: boolean;
  error?: string;
}

export interface PodPauseResult {
  success: boolean;
  error?: string;
}

export interface PodConnectionInfo {
  id: string;
  ip: string;
  port: number;
  status: string;
  ready: boolean;
}

// GPU Priority List: A40 > 4090 > 5090
// Note: For community cloud, RTX 3090 is often more available
const GPU_PRIORITY_LIST = [
  'NVIDIA A40',
  'NVIDIA GeForce RTX 4090',
  'NVIDIA GeForce RTX 5090',
  'NVIDIA GeForce RTX 3090' // Added for community cloud availability
];

// Community cloud GPU types (often more available)
const COMMUNITY_GPU_PRIORITY_LIST = [
  'NVIDIA GeForce RTX 3090',
  'NVIDIA GeForce RTX 3080',
  'NVIDIA GeForce RTX 3070',
  'NVIDIA A40',
  'NVIDIA GeForce RTX 4090'
];

class PodManager {
  private _client: any = null;
  
  private get client() {
    if (!this._client) {
      this._client = getRunpodRestClient();
    }
    return this._client;
  }

  async recruitPod(config: PodRecruitmentConfig): Promise<PodRecruitmentResult> {
    const maxRetries = config.maxRetries || 3;
    const retryDelay = config.retryDelay || 5000; // 5 seconds
    let attempts = 0;

    console.log(`🎯 Starting pod recruitment for: ${config.name}`);
    if (config.templateId) {
      console.log(`📋 Using template ID: ${config.templateId}`);
    }
    
    // Choose GPU priority list based on cloud type
    const gpuList = config.cloudType === 'COMMUNITY' ? COMMUNITY_GPU_PRIORITY_LIST : GPU_PRIORITY_LIST;
    console.log(`📋 GPU Priority: ${gpuList.join(' > ')}`);
    console.log(`☁️ Cloud Type: ${config.cloudType || 'ALL'}`);

    for (const gpuType of gpuList) {
      attempts++;
      console.log(`\n🔄 Attempt ${attempts}/${maxRetries}: Trying GPU ${gpuType}`);

      try {
        const result = await this.createPodWithGPU(config, gpuType, config.workflowName);
        
        if (result.success && result.data) {
          console.log(`✅ Successfully recruited pod with ${gpuType}`);
          console.log(`🆔 Pod ID: ${result.data.id}`);
          console.log(`📊 Status: ${result.data.status}`);
          
          // Wait for pod to be fully loaded and ready
          console.log(`\n⏳ Waiting for pod to be fully loaded...`);
          const waitResult = await this.waitForPodReady(result.data.id);
          
          if (waitResult.success) {
            console.log(`🎉 Pod is ready for use!`);
            return {
              success: true,
              pod: result.data,
              gpuType: gpuType,
              attempts: attempts
            };
          } else {
            console.log(`⚠️ Pod recruited but not ready: ${waitResult.error}`);
            // Still return success but with warning
            return {
              success: true,
              pod: result.data,
              gpuType: gpuType,
              attempts: attempts
            };
          }
        } else {
          console.log(`❌ Failed to recruit with ${gpuType}: ${result.error}`);
          
          if (attempts < maxRetries) {
            console.log(`⏳ Waiting ${retryDelay}ms before next attempt...`);
            await this.delay(retryDelay);
          }
        }
      } catch (error) {
        console.log(`❌ Error recruiting with ${gpuType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        if (attempts < maxRetries) {
          console.log(`⏳ Waiting ${retryDelay}ms before next attempt...`);
          await this.delay(retryDelay);
        }
      }
    }

    return {
      success: false,
      error: `Failed to recruit pod after ${attempts} attempts with all GPU types`,
      attempts: attempts
    };
  }

  private async createPodWithGPU(config: PodRecruitmentConfig, gpuType: string, workflowName?: string): Promise<RunPodApiResponse<RunPodPod>> {
    // Select network volume using the new method
    const selectedNetworkVolume = await this.selectNetworkVolume(config, workflowName);
    
    const podConfig: any = {
      name: config.name,
      imageName: config.imageName,
      gpuTypeIds: [gpuType], // Array as expected by RestPodConfig
      containerDiskInGb: config.containerDiskInGb || 20,
      cloudType: 'SECURE',
      computeType: 'GPU',
      gpuCount: 1,
      vcpuCount: 4,
      supportPublicIp: true,
      ports: (config.ports || '22,8080,8188,8888,11434').split(',').map(port => {
        const portNum = port.trim();
        if (portNum === '22') return '22/tcp';
        if (portNum === '8080') return '8080/http';
        if (portNum === '8188') return '8188/http'; // ComfyUI port
        if (portNum === '8888') return '8888/http';
        if (portNum === '11434') return '11434/tcp';
        return `${portNum}/tcp`;
      }),
      env: {
        JUPYTER_PASSWORD: 'secure-password-123',
        OLLAMA_HOST: '0.0.0.0:11434'
      },
      templateId: config.templateId,
      // Remove data center restriction to allow better availability
      dataCenterPriority: 'availability',
      gpuTypePriority: 'availability',
      cpuFlavorPriority: 'availability',
      minRAMPerGPU: 8,
      minVCPUPerGPU: 2,
      interruptible: false,
      locked: false,
      globalNetworking: true
    };

    // Configure volumes based on whether network volume is available
    if (selectedNetworkVolume) {
      // When using network volume, set volumeInGb to 0 to disable local volume
      podConfig.networkVolumeId = selectedNetworkVolume;
      podConfig.volumeMountPath = '/workspace';
      podConfig.volumeInGb = 0; // Explicitly set to 0 to disable local volume
      console.log(`🔗 Attaching network volume ${selectedNetworkVolume} to pod at /workspace`);
      console.log('🌐 Using network volume - local volume set to 0GB');
    } else {
      // When no network volume, use local volume
      podConfig.volumeInGb = 20;
      podConfig.volumeMountPath = '/workspace';
      console.log('📁 Using local volume (20GB) at /workspace');
      console.log('⚠️ No network volume selected - pod will be created without network volume');
    }

    return await this.client.createPod(podConfig);
  }

  async pausePod(podId: string): Promise<PodPauseResult> {
    console.log(`⏸️ Pausing pod: ${podId}`);

    try {
      const pauseResult = await this.client.pausePod(podId);
      
      if (pauseResult.success) {
        console.log(`✅ Successfully paused pod: ${podId}`);
        return { success: true };
      } else {
        console.log(`❌ Failed to pause pod: ${pauseResult.error}`);
        return { 
          success: false, 
          error: `Failed to pause pod: ${pauseResult.error}` 
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ Error pausing pod: ${errorMessage}`);
      return { 
        success: false, 
        error: `Error pausing pod: ${errorMessage}` 
      };
    }
  }

  async resumePod(podId: string): Promise<PodPauseResult> {
    console.log(`▶️ Resuming pod: ${podId}`);

    try {
      const resumeResult = await this.client.startPod(podId);
      
      if (resumeResult.success) {
        console.log(`✅ Successfully resumed pod: ${podId}`);
        return { success: true };
      } else {
        console.log(`❌ Failed to resume pod: ${resumeResult.error}`);
        return { 
          success: false, 
          error: `Failed to resume pod: ${resumeResult.error}` 
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ Error resuming pod: ${errorMessage}`);
      return { 
        success: false, 
        error: `Error resuming pod: ${errorMessage}` 
      };
    }
  }

  async releasePod(podId: string): Promise<PodReleaseResult> {
    console.log(`🗑️ Terminating pod: ${podId}`);

    try {
      // Wait for pod to be active before attempting termination
      const waitResult = await this.waitForPodActive(podId);
      if (!waitResult.success) {
        console.log(`⚠️ Pod ${podId} not active, but attempting termination anyway: ${waitResult.error}`);
      }

      const terminateResult = await this.client.terminatePod(podId);
      
      if (terminateResult.success) {
        console.log(`✅ Successfully terminated pod: ${podId}`);
        return { success: true };
      } else {
        console.log(`❌ Failed to terminate pod: ${terminateResult.error}`);
        return { 
          success: false, 
          error: `Failed to terminate pod: ${terminateResult.error}` 
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ Error terminating pod: ${errorMessage}`);
      return { 
        success: false, 
        error: `Error terminating pod: ${errorMessage}` 
      };
    }
  }

  async waitForPodReady(podId: string, maxAttempts: number = 12): Promise<{ success: boolean; error?: string; finalStatus?: string; podInfo?: PodConnectionInfo }> {
    console.log(`⏳ Waiting for pod ${podId} to be fully loaded and ready...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const podStatus = await this.getPodStatus(podId);
        
        if (podStatus.success && podStatus.data) {
          const pod = podStatus.data as any;
          const status = pod.desiredStatus || pod.status;
          
          // Calculate uptime from lastStartedAt since uptimeSeconds is not provided
          const lastStartedAt = pod.lastStartedAt;
          const uptime = lastStartedAt ? 
            Math.floor((Date.now() - new Date(lastStartedAt).getTime()) / 1000) : 0;
          
          // Check readiness indicators
          const hasPublicIp = !!pod.publicIp;
          const hasPortMappings = !!pod.portMappings && Object.keys(pod.portMappings).length > 0;
          
          console.log(`📊 Pod status (attempt ${attempt}/${maxAttempts}): ${status} (uptime: ${uptime}s, IP: ${hasPublicIp ? 'Yes' : 'No'}, Ports: ${hasPortMappings ? 'Yes' : 'No'})`);
          
          if (status === 'RUNNING') {
            // Check if pod is fully ready with all indicators (10 seconds initialization)
            if (uptime >= 10 && hasPublicIp && hasPortMappings) {
              console.log(`✅ Pod ${podId} is fully loaded and ready (uptime: ${uptime}s, has IP and ports)`);
              
              // Automatically expose port 8188 for ComfyUI
              console.log(`🔧 Automatically exposing port 8188 for ComfyUI...`);
              try {
                await this.exposeComfyUIPort(podId);
                console.log(`✅ Port 8188 exposed successfully for ComfyUI`);
              } catch (error) {
                console.log(`⚠️ Failed to expose port 8188: ${error}`);
                // Continue anyway - port exposure is not critical for pod readiness
              }
              
              // Create PodConnectionInfo for the ready pod
              const podInfo: PodConnectionInfo = {
                id: podId,
                ip: pod.publicIp || pod.ip,
                port: 11434, // Default Ollama port
                status: status,
                ready: true
              };
              
              return { success: true, finalStatus: status, podInfo };
            } else {
              let reason = 'Pod is running but not fully ready:';
              if (uptime < 10) reason += ` uptime ${uptime}s < 10s`;
              if (!hasPublicIp) reason += ` no public IP`;
              if (!hasPortMappings) reason += ` no port mappings`;
              console.log(`⏳ ${reason}`);
            }
          } else if (status === 'FAILED' || status === 'TERMINATED' || status === 'EXITED') {
            return {
              success: false,
              error: `Pod failed to start - status: ${status}`,
              finalStatus: status
            };
          } else if (status === 'STOPPED' || status === 'PAUSED') {
            console.log(`⏸️ Pod is ${status}, waiting for it to start...`);
          }
        } else {
          console.log(`❌ Failed to get pod status (attempt ${attempt}): ${podStatus.error}`);
        }
        
        // Wait 5 seconds before next attempt (faster checking for 10s initialization)
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.log(`❌ Error checking pod status (attempt ${attempt}):`, error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    return {
      success: false,
      error: `Pod did not become ready within ${maxAttempts * 5} seconds`,
      finalStatus: 'TIMEOUT'
    };
  }

  private async waitForPodActive(podId: string, maxAttempts: number = 12): Promise<{ success: boolean; error?: string }> {
    console.log(`⏳ Waiting for pod ${podId} to be active before termination...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const podStatus = await this.getPodStatus(podId);
        
        if (podStatus.success && podStatus.data) {
          const pod = podStatus.data as any;
          // Use the correct field order: desiredStatus first, then status
          const status = pod.desiredStatus || pod.status;
          console.log(`📊 Pod status (attempt ${attempt}/${maxAttempts}): ${status}`);
          
          if (status === 'RUNNING') {
            console.log(`✅ Pod ${podId} is active and ready for termination`);
            return { success: true };
          } else if (status === 'FAILED' || status === 'TERMINATED' || status === 'EXITED') {
            return {
              success: false,
              error: `Pod is already in ${status} state`
            };
          }
        }
        
        // Wait 5 seconds before next attempt
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.log(`❌ Error checking pod status (attempt ${attempt}):`, error);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return {
      success: false,
      error: `Pod did not become active within ${maxAttempts * 5} seconds`
    };
  }

  async getPodStatus(podId: string): Promise<RunPodApiResponse<RunPodPod>> {
    return await this.client.getPodById(podId);
  }

  async listAvailableGPUs(): Promise<RunPodApiResponse<any[]>> {
    return await this.client.getGpuTypes();
  }

  async getGPUPriorityList(): Promise<string[]> {
    return [...GPU_PRIORITY_LIST];
  }

  async getAvailableNetworkVolumes(): Promise<RunPodApiResponse<NetworkVolume[]>> {
    console.log('🔍 Checking available network volumes...');
    return await this.client.getNetworkVolumes();
  }

  /**
   * Get pod connection information for API access
   * This is now a simplified wrapper around waitForPodReady with a single attempt
   */
  async getPodConnectionInfo(podId: string): Promise<{ success: boolean; podInfo?: PodConnectionInfo; error?: string }> {
    try {
      const result = await this.waitForPodReady(podId, 1);
      
      if (result.success && result.podInfo) {
        return {
          success: true,
          podInfo: result.podInfo
        };
      } else {
        return {
          success: false,
          error: result.error || 'Pod not ready'
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Automatically expose port 8188 for ComfyUI on the given pod
   */
  async exposeComfyUIPort(podId: string): Promise<void> {
    try {
      const client = this.client;
      
      // Get current pod configuration
      const podResult = await client.getPodById(podId);
      
      if (!podResult.success || !podResult.data) {
        throw new Error('Failed to get pod configuration');
      }
      
      const currentPorts = podResult.data.portMappings || {};
      const portsArray = Object.keys(currentPorts).map(port => {
        if (port === '22') return '22/tcp';
        if (port === '8888') return '8888/http';
        return `${port}/tcp`;
      });
      
      // Add port 8188 if not already present
      if (!portsArray.includes('8188/http')) {
        portsArray.push('8188/http');
        
        // Update pod with new ports configuration
        const updateResult = await client.updatePod(podId, {
          ports: portsArray
        });
        
        if (!updateResult.success) {
          throw new Error('Failed to update pod configuration');
        }
        
        console.log(`✅ Port 8188 added to pod ${podId} configuration`);
      } else {
        console.log(`ℹ️ Port 8188 already exposed on pod ${podId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to expose port 8188 on pod ${podId}:`, error);
      throw error;
    }
  }

  async selectNetworkVolume(config: PodRecruitmentConfig, workflowName?: string): Promise<string | null> {
    console.log('🎯 Selecting network volume for pod creation...');
    
    // 1. Check if networkVolumeId is explicitly provided in config
    if (config.networkVolumeId) {
      console.log(`✅ Using explicitly provided network volume: ${config.networkVolumeId}`);
      return config.networkVolumeId;
    }

    // 2. Check config.json for default network volume
    const configPath = path.resolve(process.cwd(), 'api', 'runpod', 'config.json');
    try {
      const configData = require('fs').readFileSync(configPath, 'utf8');
      const configJson = JSON.parse(configData);
      
      let defaultNetworkVolume = null;
      
      if (workflowName && configJson.workflow[workflowName]?.["network-volume"]) {
        defaultNetworkVolume = configJson.workflow[workflowName]["network-volume"];
        console.log(`📋 Using workflow-specific network volume from config: ${defaultNetworkVolume}`);
      } else if (configJson.podSettings?.networkVolumeId) {
        defaultNetworkVolume = configJson.podSettings.networkVolumeId;
        console.log(`📋 Using default network volume from config: ${defaultNetworkVolume}`);
      }

      // 3. Verify the default network volume exists
      if (defaultNetworkVolume) {
        const volumeResult = await this.client.getNetworkVolumeById(defaultNetworkVolume);
        if (volumeResult.success && volumeResult.data) {
          console.log(`✅ Verified default network volume: ${volumeResult.data.name} (${volumeResult.data.id})`);
          return defaultNetworkVolume;
        } else {
          console.log(`⚠️ Default network volume ${defaultNetworkVolume} not found, searching for alternatives...`);
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not read config file: ${error}`);
    }

    // 4. Search for available network volumes
    console.log('🔍 Searching for available network volumes...');
    const volumesResult = await this.getAvailableNetworkVolumes();
    
    if (volumesResult.success && volumesResult.data && volumesResult.data.length > 0) {
      const availableVolumes = volumesResult.data;
      console.log(`📊 Found ${availableVolumes.length} available network volumes:`);
      
      availableVolumes.forEach((volume, index) => {
        console.log(`   ${index + 1}. ${volume.name} (${volume.id}) - ${volume.size}GB - ${volume.dataCenterId}`);
      });

      // Select the first available volume
      const selectedVolume = availableVolumes[0];
      console.log(`✅ Selected network volume: ${selectedVolume.name} (${selectedVolume.id})`);
      return selectedVolume.id;
    } else {
      console.log('❌ No network volumes available');
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const podManager = new PodManager();

// Export helper functions
export async function recruitPod(config: PodRecruitmentConfig): Promise<PodRecruitmentResult> {
  return podManager.recruitPod(config);
}

export async function pausePod(podId: string): Promise<PodPauseResult> {
  return podManager.pausePod(podId);
}

export async function resumePod(podId: string): Promise<PodPauseResult> {
  return podManager.resumePod(podId);
}

export async function releasePod(podId: string): Promise<PodReleaseResult> {
  return podManager.releasePod(podId);
}

export async function getPodStatus(podId: string): Promise<RunPodApiResponse<RunPodPod>> {
  return podManager.getPodStatus(podId);
}

export async function listAvailableGPUs(): Promise<RunPodApiResponse<any[]>> {
  return podManager.listAvailableGPUs();
}

export async function getGPUPriorityList(): Promise<string[]> {
  return podManager.getGPUPriorityList();
}

export async function getAvailableNetworkVolumes(): Promise<RunPodApiResponse<NetworkVolume[]>> {
  return podManager.getAvailableNetworkVolumes();
}

export async function selectNetworkVolume(config: PodRecruitmentConfig, workflowName?: string): Promise<string | null> {
  return podManager.selectNetworkVolume(config, workflowName);
}

export async function waitForPodReady(podId: string, maxAttempts?: number): Promise<{ success: boolean; error?: string; finalStatus?: string; podInfo?: PodConnectionInfo }> {
  return podManager.waitForPodReady(podId, maxAttempts);
}

export async function getPodConnectionInfo(podId: string): Promise<{ success: boolean; podInfo?: PodConnectionInfo; error?: string }> {
  return podManager.getPodConnectionInfo(podId);
}

export async function exposeComfyUIPort(podId: string): Promise<void> {
  return podManager.exposeComfyUIPort(podId);
}
