import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

export interface ComfyUIWorkflow {
  id: string;
  revision: number;
  last_node_id: number;
  last_link_id: number;
  nodes: any[];
  links: any[];
  groups: any[];
  config: any;
  extra: any;
  version: number;
}

export interface ComfyUIResponse {
  prompt_id: string;
  number: number;
  node_errors: any;
}

export interface ComfyUIHistory {
  [key: string]: {
    status: {
      status_str: string;
      completed: boolean;
      messages: string[];
    };
    outputs: {
      [nodeId: string]: {
        images: Array<{
          filename: string;
          subfolder: string;
          type: string;
        }>;
      };
    };
  };
}

export interface WorkflowConfig {
  workflows: {
    [key: string]: {
      name: string;
      description: string;
      workflow: string;
      category: string;
      model: string;
      inputs: {
        [key: string]: {
          type: string;
          required: boolean;
          description: string;
          node_id: number;
          node_type: string;
          widget_name: string;
          widget_index: number;
          default: any;
          min?: number;
          max?: number;
          options?: string[];
        };
      };
      outputs: {
        [key: string]: {
          type: string;
          description: string;
          node_id: number;
          node_type: string;
        };
      };
      performance: {
        estimated_time: string;
        vram_usage: string;
        recommended_gpu: string;
      };
    };
  };
  categories: {
    [key: string]: {
      name: string;
      description: string;
      icon: string;
    };
  };
}

export interface WorkflowInput {
  [key: string]: any;
}

export interface WorkflowResult {
  success: boolean;
  prompt_id?: string;
  images?: Array<{
    filename: string;
    subfolder: string;
    type: string;
    url: string;
  }>;
  error?: string;
  status?: string;
}

export class ComfyUIService {
  private baseUrl: string;
  private workflowsConfig: WorkflowConfig;

  constructor(podIp: string, port: number = 8188) {
    this.baseUrl = `http://${podIp}:${port}`;
    this.loadWorkflowsConfig();
  }

  private loadWorkflowsConfig(): void {
    const configPath = path.resolve(process.cwd(), 'backend', 'comfyUI', 'workflows-config.json');
    this.workflowsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        timeout: 10000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async getSystemStats(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/system_stats`, {
        method: 'GET',
        timeout: 10000
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get system stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getQueue(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/queue`, {
        method: 'GET',
        timeout: 10000
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get queue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getHistory(promptId?: string): Promise<any> {
    try {
      const url = promptId ? `${this.baseUrl}/history/${promptId}` : `${this.baseUrl}/history`;
      const response = await fetch(url, {
        method: 'GET',
        timeout: 10000
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async loadWorkflow(workflowName: string): Promise<ComfyUIWorkflow> {
    const workflowConfig = this.workflowsConfig.workflows[workflowName];
    if (!workflowConfig) {
      throw new Error(`Workflow '${workflowName}' not found`);
    }

    const workflowPath = path.join(__dirname, 'workflows', workflowConfig.workflow);
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    return workflowData;
  }

  async executeWorkflow(workflowName: string, inputs: WorkflowInput): Promise<WorkflowResult> {
    try {
      // Load the workflow
      const workflow = await this.loadWorkflow(workflowName);
      const workflowConfig = this.workflowsConfig.workflows[workflowName];

      // Apply inputs to the workflow
      const modifiedWorkflow = this.applyInputs(workflow, workflowConfig.inputs, inputs);

      // Execute the workflow
      const response = await fetch(`${this.baseUrl}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: modifiedWorkflow,
          client_id: 'comfyui-service'
        }),
        timeout: 30000
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Workflow execution failed: ${response.status} - ${errorText}`);
      }

      const result: ComfyUIResponse = await response.json();
      
      return {
        success: true,
        prompt_id: result.prompt_id,
        status: 'submitted'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async waitForCompletion(promptId: string, timeoutMs: number = 300000): Promise<WorkflowResult> {
    const startTime = Date.now();
    const checkInterval = 5000; // Check every 5 seconds

    while (Date.now() - startTime < timeoutMs) {
      try {
        const history = await this.getHistory(promptId);
        const promptData = history[promptId];

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
                    url: `${this.baseUrl}/view?filename=${image.filename}&subfolder=${image.subfolder}&type=${image.type}`
                  });
                }
              }
            }

            return {
              success: true,
              prompt_id: promptId,
              images,
              status: 'completed'
            };
          } else if (status.status_str === 'error') {
            return {
              success: false,
              prompt_id: promptId,
              error: status.messages.join(', '),
              status: 'error'
            };
          }
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, checkInterval));

      } catch (error) {
        // Continue waiting on error, might be temporary
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    return {
      success: false,
      prompt_id: promptId,
      error: 'Workflow did not complete within timeout',
      status: 'timeout'
    };
  }

  async generateImage(workflowName: string, prompt: string, options: Partial<WorkflowInput> = {}): Promise<WorkflowResult> {
    const inputs: WorkflowInput = {
      prompt,
      ...options
    };

    // Execute the workflow
    const result = await this.executeWorkflow(workflowName, inputs);
    
    if (!result.success || !result.prompt_id) {
      return result;
    }

    // Wait for completion
    return await this.waitForCompletion(result.prompt_id);
  }

  private applyInputs(workflow: ComfyUIWorkflow, inputConfig: any, inputs: WorkflowInput): ComfyUIWorkflow {
    const modifiedWorkflow = JSON.parse(JSON.stringify(workflow)); // Deep clone

    for (const [inputName, inputValue] of Object.entries(inputs)) {
      const config = inputConfig[inputName];
      if (!config) continue;

      const node = modifiedWorkflow.nodes.find((n: any) => n.id === config.node_id);
      if (!node) continue;

      // Apply the input value to the node's widget
      if (node.widgets_values && node.widgets_values[config.widget_index] !== undefined) {
        node.widgets_values[config.widget_index] = inputValue;
      }
    }

    return modifiedWorkflow;
  }

  getAvailableWorkflows(): string[] {
    return Object.keys(this.workflowsConfig.workflows);
  }

  getWorkflowConfig(workflowName: string): any {
    return this.workflowsConfig.workflows[workflowName];
  }

  getWorkflowCategories(): any {
    return this.workflowsConfig.categories;
  }

  async downloadImage(imageUrl: string, outputPath: string): Promise<void> {
    try {
      const response = await fetch(imageUrl, {
        method: 'GET',
        timeout: 30000
      });

      if (response.ok) {
        const buffer = await response.buffer();
        fs.writeFileSync(outputPath, buffer);
      } else {
        throw new Error(`Failed to download image: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Error downloading image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default ComfyUIService;
