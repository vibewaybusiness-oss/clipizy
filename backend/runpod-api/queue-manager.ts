import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { recruitPod, pausePod, resumePod, releasePod, getPodStatus } from './index';
import { getRunpodGraphQLClient } from './client';

// Load configuration
const configPath = path.resolve(process.cwd(), 'backend', 'runpod-api', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export interface WorkflowRequest {
  id: string;
  workflowName: string;
  requestData: any;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  podId?: string;
}

export interface ActivePod {
  id: string;
  workflowName: string;
  createdAt: number;
  lastUsedAt: number;
  pauseTimeoutAt: number;
  terminateTimeoutAt: number;
  pausedAt?: number;
  status: 'running' | 'paused' | 'terminated';
  requestQueue: WorkflowRequest[];
}

export interface QueueManager {
  activePods: Map<string, ActivePod>;
  pendingRequests: Map<string, WorkflowRequest[]>;
  isRunning: boolean;
  intervalId?: NodeJS.Timeout;
}

class WorkflowQueueManager {
  private queueManager: QueueManager;
  private client: any;

  constructor() {
    this.queueManager = {
      activePods: new Map(),
      pendingRequests: new Map(),
      isRunning: false
    };
    this._client = null;
  }

  private getClient() {
    if (!this._client) {
      this._client = getRunpodGraphQLClient();
    }
    return this._client;
  }

  private _client: any = null;

  async start() {
    if (this.queueManager.isRunning) {
      console.log('⚠️ Queue manager is already running');
      return;
    }

    console.log('🚀 Starting Workflow Queue Manager...');
    this.queueManager.isRunning = true;

    // Start the main processing loop
    this.queueManager.intervalId = setInterval(() => {
      this.processQueue();
    }, config.queueSettings.checkInterval);

    console.log('✅ Queue manager started successfully');
  }

  async stop() {
    if (!this.queueManager.isRunning) {
      console.log('⚠️ Queue manager is not running');
      return;
    }

    console.log('🛑 Stopping Workflow Queue Manager...');
    this.queueManager.isRunning = false;

    if (this.queueManager.intervalId) {
      clearInterval(this.queueManager.intervalId);
      this.queueManager.intervalId = undefined;
    }

    // Pause all active pods
    for (const [podId, pod] of this.queueManager.activePods) {
      if (pod.status === 'running') {
        console.log(`⏸️ Pausing pod ${podId} before shutdown`);
        await pausePod(podId);
      }
    }

    console.log('✅ Queue manager stopped successfully');
  }

  async addWorkflowRequest(workflowName: string, requestData: any): Promise<string> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request: WorkflowRequest = {
      id: requestId,
      workflowName: workflowName.toLowerCase(),
      requestData,
      timestamp: Date.now(),
      status: 'pending'
    };

    // Add to pending requests
    if (!this.queueManager.pendingRequests.has(request.workflowName)) {
      this.queueManager.pendingRequests.set(request.workflowName, []);
    }
    this.queueManager.pendingRequests.get(request.workflowName)!.push(request);

    console.log(`📝 Added workflow request: ${request.workflowName} (${requestId})`);
    
    // Try to process immediately
    await this.processQueue();

    return requestId;
  }

  private async processQueue() {
    if (!this.queueManager.isRunning) return;

    // Process each workflow type
    for (const [workflowName, requests] of this.queueManager.pendingRequests) {
      if (requests.length === 0) continue;

      // Find available pod for this workflow
      let availablePod = this.findAvailablePod(workflowName);
      
      if (!availablePod) {
        // Check if we're already creating a pod for this workflow
        const creatingPod = Array.from(this.queueManager.activePods.values())
          .find(pod => pod.workflowName === workflowName);
        
        if (creatingPod) {
          console.log(`⏳ Pod ${creatingPod.id} is already being created for workflow ${workflowName}`);
          continue; // Skip this workflow for now
        }
        
        // Try to create a new pod
        availablePod = await this.createPodForWorkflow(workflowName);
      }

      if (availablePod) {
        // Process requests for this pod
        await this.processPodRequests(availablePod);
      }
    }

    // Check for pods that need to be paused due to timeout
    await this.checkPodTimeouts();
  }

  private findAvailablePod(workflowName: string): ActivePod | null {
    for (const [podId, pod] of this.queueManager.activePods) {
      if (pod.workflowName === workflowName && 
          (pod.status === 'running' || pod.status === 'paused') && 
          pod.requestQueue.length < 3) { // Max 3 concurrent requests per pod
        return pod;
      }
    }
    return null;
  }

  private async createPodForWorkflow(workflowName: string): Promise<ActivePod | null> {
    try {
      console.log(`🏗️ Creating new pod for workflow: ${workflowName}`);
      
      // Check if we're already creating a pod for this workflow
      const existingPod = Array.from(this.queueManager.activePods.values())
        .find(pod => pod.workflowName === workflowName && pod.status === 'running');
      
      if (existingPod) {
        console.log(`⚠️ Pod already exists for workflow ${workflowName}: ${existingPod.id}`);
        return existingPod;
      }
      
      // Check network volume availability first
      const hasNetworkVolumes = await this.checkNetworkVolumeAvailability();
      if (!hasNetworkVolumes) {
        console.log('⚠️ No network volumes available, creating pod without network volume');
      }
      
      const podConfig = {
        name: `${workflowName}-pod-${Date.now()}`,
        imageName: config.podSettings.defaultImage,
        cloudType: 'SECURE' as const, // Use SECURE for network volume access
        gpuCount: config.podSettings.defaultGpuCount,
        minMemoryInGb: config.podSettings.defaultMemoryInGb,
        countryCode: 'SE', // Use Sweden to match network volume data center
        supportPublicIp: config.podSettings.supportPublicIp,
        containerDiskInGb: config.podSettings.defaultDiskInGb,
        minVcpuCount: config.podSettings.defaultVcpuCount,
        ports: config.podSettings.defaultPorts,
        dockerArgs: '',
        maxRetries: 2, // Reduced retries to prevent multiple pods
        retryDelay: 3000, // Reduced delay
        workflowName: workflowName // Pass workflow name for network volume selection
      };

      console.log(`🎯 Pod config for ${workflowName}:`, {
        name: podConfig.name,
        imageName: podConfig.imageName,
        cloudType: podConfig.cloudType,
        countryCode: podConfig.countryCode,
        workflowName: podConfig.workflowName,
        hasNetworkVolumes: hasNetworkVolumes
      });

      const result = await recruitPod(podConfig);
      
      if (result.success && result.pod) {
        const timeouts = this.getWorkflowTimeouts(workflowName);
        const now = Date.now();
        const activePod: ActivePod = {
          id: result.pod.id,
          workflowName,
          createdAt: now,
          lastUsedAt: now,
          pauseTimeoutAt: now + (timeouts.pause * 1000),
          terminateTimeoutAt: now + (timeouts.terminate * 1000),
          status: 'running',
          requestQueue: []
        };

        this.queueManager.activePods.set(result.pod.id, activePod);
        console.log(`✅ Created pod ${result.pod.id} for workflow ${workflowName}`);
        
        return activePod;
      } else {
        console.log(`❌ Failed to create pod for workflow ${workflowName}: ${result.error}`);
        return null;
      }
    } catch (error) {
      console.log(`❌ Error creating pod for workflow ${workflowName}:`, error);
      return null;
    }
  }

  private async processPodRequests(pod: ActivePod) {
    const pendingRequests = this.queueManager.pendingRequests.get(pod.workflowName) || [];
    
    if (pendingRequests.length === 0) return;

    // Move requests to pod queue
    const requestsToProcess = pendingRequests.splice(0, 3 - pod.requestQueue.length);
    pod.requestQueue.push(...requestsToProcess);

    console.log(`🔄 Queuing ${requestsToProcess.length} requests for pod ${pod.id}`);

    // Mark requests as processing and assign to pod
    for (const request of requestsToProcess) {
      request.status = 'processing';
      request.podId = pod.id;
      console.log(`📋 Request ${request.id} assigned to pod ${pod.id} for ${request.workflowName} workflow`);
    }

    // Update pod last used time and reset timeouts
    const now = Date.now();
    pod.lastUsedAt = now;
    const timeouts = this.getWorkflowTimeouts(pod.workflowName);
    pod.pauseTimeoutAt = now + (timeouts.pause * 1000);
    pod.terminateTimeoutAt = now + (timeouts.terminate * 1000);
    
    // If pod was paused, resume it
    if (pod.status === 'paused') {
      try {
        const resumeResult = await resumePod(pod.id);
        if (resumeResult.success) {
          pod.status = 'running';
          pod.pausedAt = undefined;
          console.log(`🔄 Successfully resumed pod ${pod.id} due to new requests`);
        } else {
          console.log(`❌ Failed to resume pod ${pod.id}: ${resumeResult.error}`);
          return; // Don't process requests if we can't resume the pod
        }
      } catch (error) {
        console.log(`❌ Error resuming pod ${pod.id}:`, error);
        return; // Don't process requests if we can't resume the pod
      }
    }
  }



  private async waitForPodWithIp(podId: string, maxAttempts: number = 12): Promise<{ success: boolean; pod?: any; error?: string }> {
    console.log(`⏳ Waiting for pod ${podId} to have IP address...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const podStatus = await getPodStatus(podId);
        
        if (podStatus.success && podStatus.data) {
          const pod = podStatus.data as any;
          const status = pod.desiredStatus || pod.status;
          console.log(`📊 Pod status (attempt ${attempt}/${maxAttempts}): ${status}`);
          
          if (status === 'RUNNING') {
            // Try to get the pod's public IP
            const podWithIp = await this.getPodPublicIp(podId);
            if (podWithIp.success && podWithIp.pod?.ip) {
              console.log(`✅ Pod is ready with IP: ${podWithIp.pod.ip}`);
              return podWithIp;
            } else {
              console.log(`⏳ Pod is running but IP not yet available, waiting...`);
            }
          } else if (status === 'FAILED' || status === 'TERMINATED' || status === 'EXITED') {
            return {
              success: false,
              error: `Pod failed with status: ${status}`
            };
          }
        }
        
        // Wait 10 seconds before next attempt
        await new Promise(resolve => setTimeout(resolve, 10000));
        
      } catch (error) {
        console.log(`❌ Error checking pod status (attempt ${attempt}):`, error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    return {
      success: false,
      error: `Pod did not become ready with IP within ${maxAttempts * 10} seconds`
    };
  }

  private async getPodPublicIp(podId: string): Promise<{ success: boolean; pod?: any; error?: string }> {
    try {
      // Use the REST API to get pod details
      const client = this.getClient();
      const podResult = await client.getPodById(podId);
      
      if (podResult.success && podResult.data) {
        const pod = podResult.data as any;
        
        // Check if the pod has a public IP (it might be empty initially)
        const publicIp = pod.publicIp;
        if (publicIp && publicIp !== '') {
          return {
            success: true,
            pod: { ...pod, ip: publicIp }
          };
        } else {
          return {
            success: false,
            error: 'Pod does not have a public IP address yet'
          };
        }
      } else {
        return {
          success: false,
          error: podResult.error || 'Failed to get pod details'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting pod IP'
      };
    }
  }


  private async checkPodTimeouts() {
    const now = Date.now();
    
    for (const [podId, pod] of this.queueManager.activePods) {
      if (pod.status === 'running' && 
          pod.requestQueue.length === 0 && 
          now > pod.pauseTimeoutAt) {
        
        console.log(`⏰ Pod ${podId} reached pause timeout, pausing...`);
        pod.status = 'paused';
        pod.pausedAt = now;
        
        try {
          await pausePod(podId);
          console.log(`✅ Pod ${podId} paused due to timeout`);
        } catch (error) {
          console.log(`❌ Failed to pause pod ${podId}:`, error);
        }
      } else if (pod.status === 'paused' && 
                 pod.pausedAt && 
                 now > pod.terminateTimeoutAt) {
        
        console.log(`⏰ Pod ${podId} reached terminate timeout, terminating...`);
        pod.status = 'terminated';
        
        try {
          await releasePod(podId);
          console.log(`✅ Pod ${podId} terminated due to timeout`);
          this.queueManager.activePods.delete(podId);
        } catch (error) {
          console.log(`❌ Failed to terminate pod ${podId}:`, error);
        }
      }
    }
  }

  private getWorkflowTimeouts(workflowName: string): { pause: number; terminate: number } {
    return config.workflow[workflowName]?.timeouts || config.workflow.default.timeouts;
  }

  private getWorkflowNetworkVolume(workflowName: string): string {
    return config.workflow[workflowName]?.["network-volume"] || config.workflow.default["network-volume"];
  }

  private async checkNetworkVolumeAvailability(): Promise<boolean> {
    try {
      console.log('🔍 Checking network volume availability...');
      const client = this.getClient();
      const volumesResult = await client.getNetworkVolumes();
      
      if (volumesResult.success && volumesResult.data && volumesResult.data.length > 0) {
        console.log(`✅ Found ${volumesResult.data.length} available network volumes`);
        volumesResult.data.forEach((volume: any, index: number) => {
          console.log(`   ${index + 1}. ${volume.name} (${volume.id}) - ${volume.size}GB - ${volume.dataCenterId}`);
        });
        return true;
      } else {
        console.log('❌ No network volumes available');
        return false;
      }
    } catch (error) {
      console.log('❌ Error checking network volumes:', error);
      return false;
    }
  }

  getQueueStatus() {
    return {
      activePods: Array.from(this.queueManager.activePods.values()),
      pendingRequests: Object.fromEntries(
        Array.from(this.queueManager.pendingRequests.entries()).map(([name, requests]) => [
          name, 
          requests.filter(req => req.status === 'pending')
        ])
      ),
      isRunning: this.queueManager.isRunning
    };
  }

  getPodForWorkflow(workflowName: string): ActivePod | null {
    return this.findAvailablePod(workflowName);
  }

  getPodById(podId: string): ActivePod | null {
    return this.queueManager.activePods.get(podId) || null;
  }

  async getPodWithIp(podId: string): Promise<{ success: boolean; pod?: any; error?: string }> {
    return await this.waitForPodWithIp(podId);
  }

  markRequestCompleted(requestId: string, result?: any) {
    for (const [podId, pod] of this.queueManager.activePods) {
      const request = pod.requestQueue.find(req => req.id === requestId);
      if (request) {
        request.status = 'completed';
        if (result) {
          (request as any).result = result;
        }
        console.log(`✅ Request ${requestId} marked as completed on pod ${podId}`);
        return true;
      }
    }
    return false;
  }

  markRequestFailed(requestId: string, error?: string) {
    for (const [podId, pod] of this.queueManager.activePods) {
      const request = pod.requestQueue.find(req => req.id === requestId);
      if (request) {
        request.status = 'failed';
        if (error) {
          (request as any).error = error;
        }
        console.log(`❌ Request ${requestId} marked as failed on pod ${podId}`);
        return true;
      }
    }
    return false;
  }

  async cleanup() {
    console.log('🧹 Cleaning up queue manager...');
    
    // Terminate all active pods
    for (const [podId, pod] of this.queueManager.activePods) {
      try {
        await releasePod(podId);
        console.log(`✅ Terminated pod ${podId}`);
      } catch (error) {
        console.log(`❌ Failed to terminate pod ${podId}:`, error);
      }
    }

    this.queueManager.activePods.clear();
    this.queueManager.pendingRequests.clear();
  }
}

// Singleton instance
let queueManagerInstance: WorkflowQueueManager | null = null;

export function getQueueManager(): WorkflowQueueManager {
  if (!queueManagerInstance) {
    queueManagerInstance = new WorkflowQueueManager();
  }
  return queueManagerInstance;
}

export { WorkflowQueueManager };
