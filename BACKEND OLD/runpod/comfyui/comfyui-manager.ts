import { getQueueManager } from '../runpod-api/queue-manager';
import ComfyUIService, { WorkflowInput, WorkflowResult } from './comfyui-service';
import { getPodConnectionInfo } from '../runpod-api/pod-management';

export interface ComfyUIRequest {
  id: string;
  workflowName: string;
  inputs: WorkflowInput;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  podId?: string;
  podIp?: string;
  promptId?: string;
  result?: WorkflowResult;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export class ComfyUIManager {
  private queueManager = getQueueManager();
  private activeServices: Map<string, ComfyUIService> = new Map();
  private requests: Map<string, ComfyUIRequest> = new Map();

  constructor() {
    // Start queue manager if not already running
    this.initializeQueueManager();
  }

  private async initializeQueueManager(): Promise<void> {
    const status = this.queueManager.getQueueStatus();
    if (!status.isRunning) {
      await this.queueManager.start();
      console.log('🚀 ComfyUI Manager: Queue manager started');
    }
  }

  async executeWorkflow(workflowName: string, inputs: WorkflowInput): Promise<ComfyUIRequest> {
    const requestId = `comfyui_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request: ComfyUIRequest = {
      id: requestId,
      workflowName,
      inputs,
      status: 'pending',
      createdAt: Date.now()
    };

    this.requests.set(requestId, request);

    try {
      // Add request to queue manager
      const queueRequestId = await this.queueManager.addWorkflowRequest(workflowName, inputs);
      console.log(`📝 ComfyUI Manager: Queued workflow request ${workflowName} (${queueRequestId})`);

      // Get pod for this workflow
      const pod = this.queueManager.getPodForWorkflow(workflowName);
      
      if (!pod) {
        request.status = 'pending';
        request.error = 'No pod available, waiting for pod allocation';
        console.log(`⏳ ComfyUI Manager: Waiting for pod allocation for ${workflowName}`);
        return request;
      }

      // Get pod with IP information
      const podWithIp = await this.queueManager.getPodWithIp(pod.id);
      
      if (!podWithIp.success || !podWithIp.pod?.ip) {
        request.status = 'pending';
        request.error = 'Pod is not ready yet, waiting for initialization';
        console.log(`⏳ ComfyUI Manager: Pod ${pod.id} not ready yet`);
        return request;
      }

      // Update request with pod information
      request.podId = pod.id;
      request.podIp = podWithIp.pod.ip;
      request.status = 'processing';

      console.log(`🎯 ComfyUI Manager: Executing ${workflowName} on pod ${pod.id} (${podWithIp.pod.ip})`);

      // Get or create ComfyUI service for this pod
      let service = this.activeServices.get(pod.id);
      if (!service) {
        service = new ComfyUIService(podWithIp.pod.ip);
        this.activeServices.set(pod.id, service);
        console.log(`🔧 ComfyUI Manager: Created service for pod ${pod.id}`);
      }

      // Test connection with retries
      let isConnected = false;
      let connectionAttempts = 0;
      const maxConnectionAttempts = 12; // 2 minutes with 10-second intervals
      
      while (!isConnected && connectionAttempts < maxConnectionAttempts) {
        isConnected = await service.testConnection();
        if (!isConnected) {
          connectionAttempts++;
          console.log(`⏳ ComfyUI Manager: Waiting for ComfyUI on pod ${pod.id} (attempt ${connectionAttempts}/${maxConnectionAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        }
      }
      
      if (!isConnected) {
        request.status = 'pending';
        request.error = `ComfyUI not ready on pod ${pod.id} after ${maxConnectionAttempts} attempts`;
        console.log(`❌ ComfyUI Manager: Cannot connect to ComfyUI on pod ${pod.id} after ${maxConnectionAttempts} attempts`);
        return request;
      }

      // Execute the workflow
      const result = await service.executeWorkflow(workflowName, inputs);
      
      if (result.success) {
        request.promptId = result.prompt_id;
        request.status = 'processing';
        console.log(`✅ ComfyUI Manager: Workflow ${workflowName} submitted (${result.prompt_id})`);
        
        // Start monitoring for completion
        this.monitorWorkflowCompletion(request, service);
      } else {
        request.status = 'failed';
        request.error = result.error;
        console.log(`❌ ComfyUI Manager: Workflow ${workflowName} failed: ${result.error}`);
      }

      return request;

    } catch (error) {
      request.status = 'failed';
      request.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ ComfyUI Manager: Error executing workflow ${workflowName}:`, error);
      return request;
    }
  }

  private async monitorWorkflowCompletion(request: ComfyUIRequest, service: ComfyUIService): Promise<void> {
    if (!request.promptId || !request.podId) return;

    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const checkCompletion = async (): Promise<void> => {
      try {
        attempts++;
        
        const history = await service.getHistory(request.promptId!);
        const promptData = history[request.promptId!];

        if (promptData) {
          const status = promptData.status;
          
          if (status.completed) {
            // Extract images from outputs
            const images: Array<{filename: string, subfolder: string, type: string, url: string}> = [];
            
            for (const nodeId in promptData.outputs) {
              const nodeOutput = promptData.outputs[nodeId];
              if (nodeOutput.images) {
                for (const image of nodeOutput.images) {
                  images.push({
                    ...image,
                    url: `${service['baseUrl']}/view?filename=${image.filename}&subfolder=${image.subfolder}&type=${image.type}`
                  });
                }
              }
            }

            request.status = 'completed';
            request.completedAt = Date.now();
            request.result = {
              success: true,
              prompt_id: request.promptId,
              images,
              status: 'completed'
            };

            // Mark request as completed in queue manager
            this.queueManager.markRequestCompleted(request.id, request.result);

            console.log(`✅ ComfyUI Manager: Workflow ${request.workflowName} completed (${request.promptId})`);

          } else if (status.status_str === 'error') {
            request.status = 'failed';
            request.error = status.messages.join(', ');
            request.completedAt = Date.now();

            // Mark request as failed in queue manager
            this.queueManager.markRequestFailed(request.id, request.error);

            console.log(`❌ ComfyUI Manager: Workflow ${request.workflowName} failed: ${request.error}`);

          } else if (attempts < maxAttempts) {
            // Continue monitoring
            setTimeout(checkCompletion, 5000);
          } else {
            // Timeout
            request.status = 'failed';
            request.error = 'Workflow did not complete within timeout';
            request.completedAt = Date.now();

            this.queueManager.markRequestFailed(request.id, request.error);
            console.log(`⏰ ComfyUI Manager: Workflow ${request.workflowName} timed out`);
          }
        } else if (attempts < maxAttempts) {
          // Continue monitoring
          setTimeout(checkCompletion, 5000);
        } else {
          // Timeout
          request.status = 'failed';
          request.error = 'Workflow not found in history';
          request.completedAt = Date.now();

          this.queueManager.markRequestFailed(request.id, request.error);
          console.log(`⏰ ComfyUI Manager: Workflow ${request.workflowName} not found in history`);
        }

      } catch (error) {
        if (attempts < maxAttempts) {
          // Continue monitoring on error
          setTimeout(checkCompletion, 5000);
        } else {
          request.status = 'failed';
          request.error = error instanceof Error ? error.message : 'Unknown error';
          request.completedAt = Date.now();

          this.queueManager.markRequestFailed(request.id, request.error);
          console.log(`❌ ComfyUI Manager: Error monitoring workflow ${request.workflowName}:`, error);
        }
      }
    };

    // Start monitoring
    setTimeout(checkCompletion, 5000);
  }

  getRequest(requestId: string): ComfyUIRequest | null {
    return this.requests.get(requestId) || null;
  }

  getAllRequests(): ComfyUIRequest[] {
    return Array.from(this.requests.values());
  }

  getActiveRequests(): ComfyUIRequest[] {
    return Array.from(this.requests.values()).filter(req => 
      req.status === 'pending' || req.status === 'processing'
    );
  }

  getCompletedRequests(): ComfyUIRequest[] {
    return Array.from(this.requests.values()).filter(req => 
      req.status === 'completed' || req.status === 'failed'
    );
  }

  async getQueueStatus() {
    const queueStatus = this.queueManager.getQueueStatus();
    return {
      ...queueStatus,
      comfyuiRequests: {
        total: this.requests.size,
        active: this.getActiveRequests().length,
        completed: this.getCompletedRequests().length,
        pending: this.requests.size - this.getActiveRequests().length - this.getCompletedRequests().length
      }
    };
  }

  async cleanup(): Promise<void> {
    console.log('🧹 ComfyUI Manager: Cleaning up...');
    
    // Clear all requests
    this.requests.clear();
    
    // Clear active services
    this.activeServices.clear();
    
    // Stop queue manager
    await this.queueManager.stop();
    
    console.log('✅ ComfyUI Manager: Cleanup completed');
  }
}

// Singleton instance
let comfyUIManagerInstance: ComfyUIManager | null = null;

export function getComfyUIManager(): ComfyUIManager {
  if (!comfyUIManagerInstance) {
    comfyUIManagerInstance = new ComfyUIManager();
  }
  return comfyUIManagerInstance;
}

export default ComfyUIManager;
