import { WorkflowRequest, QueueStatus } from './types';

class QueueManager {
  private requests: Map<string, WorkflowRequest> = new Map();
  private isRunning: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private maxConcurrentRequests: number = 3;
  private processingRequests: Set<string> = new Set();

  constructor(maxConcurrentRequests: number = 3) {
    this.maxConcurrentRequests = maxConcurrentRequests;
  }

  async addWorkflowRequest(workflowName: string, requestData: any): Promise<string> {
    const requestId = this.generateRequestId();
    const request: WorkflowRequest = {
      id: requestId,
      workflowName,
      requestData,
      status: 'pending',
      createdAt: new Date()
    };

    this.requests.set(requestId, request);
    return requestId;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.processingInterval = setInterval(() => {
      this.processNextRequests();
    }, 1000); // Check every second
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  async cleanup(): Promise<void> {
    await this.stop();
    this.requests.clear();
    this.processingRequests.clear();
  }

  getQueueStatus(): QueueStatus {
    const allRequests = Array.from(this.requests.values());
    const pendingRequests = allRequests.filter(r => r.status === 'pending').length;
    const processingRequests = allRequests.filter(r => r.status === 'processing').length;
    const completedRequests = allRequests.filter(r => r.status === 'completed').length;
    const failedRequests = allRequests.filter(r => r.status === 'failed').length;

    return {
      isRunning: this.isRunning,
      pendingRequests,
      processingRequests,
      completedRequests,
      failedRequests,
      totalRequests: allRequests.length
    };
  }

  getRequest(requestId: string): WorkflowRequest | undefined {
    return this.requests.get(requestId);
  }

  getAllRequests(): WorkflowRequest[] {
    return Array.from(this.requests.values());
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async processNextRequests(): Promise<void> {
    if (!this.isRunning || this.processingRequests.size >= this.maxConcurrentRequests) {
      return;
    }

    const pendingRequests = Array.from(this.requests.values())
      .filter(r => r.status === 'pending')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const availableSlots = this.maxConcurrentRequests - this.processingRequests.size;
    const requestsToProcess = pendingRequests.slice(0, availableSlots);

    for (const request of requestsToProcess) {
      this.processRequest(request);
    }
  }

  private async processRequest(request: WorkflowRequest): Promise<void> {
    this.processingRequests.add(request.id);

    const updatedRequest = {
      ...request,
      status: 'processing' as const,
      startedAt: new Date()
    };
    this.requests.set(request.id, updatedRequest);

    try {
      const result = await this.executeWorkflow(request.workflowName, request.requestData);

      const completedRequest = {
        ...updatedRequest,
        status: 'completed' as const,
        completedAt: new Date(),
        result
      };
      this.requests.set(request.id, completedRequest);
    } catch (error) {
      const failedRequest = {
        ...updatedRequest,
        status: 'failed' as const,
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.requests.set(request.id, failedRequest);
    } finally {
      this.processingRequests.delete(request.id);
    }
  }

  private async executeWorkflow(workflowName: string, requestData: any): Promise<any> {
    // This is a placeholder implementation
    // In a real implementation, this would call the appropriate workflow execution service
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time

    return {
      workflowName,
      requestData,
      result: `Workflow ${workflowName} completed successfully`,
      timestamp: new Date().toISOString()
    };
  }

  async removeRequest(requestId: string): Promise<boolean> {
    if (this.processingRequests.has(requestId)) {
      return false; // Cannot remove a request that's currently processing
    }

    return this.requests.delete(requestId);
  }

  async clearCompletedRequests(): Promise<number> {
    let removedCount = 0;
    for (const [id, request] of this.requests.entries()) {
      if (request.status === 'completed' || request.status === 'failed') {
        this.requests.delete(id);
        removedCount++;
      }
    }
    return removedCount;
  }
}

let queueManagerInstance: QueueManager | null = null;

export function getQueueManager(): QueueManager {
  if (!queueManagerInstance) {
    queueManagerInstance = new QueueManager();
  }
  return queueManagerInstance;
}

export { QueueManager };