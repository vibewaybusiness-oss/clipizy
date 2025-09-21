export interface RunPodConfig {
  apiKey: string;
  graphqlUrl: string;
  restUrl: string;
}

export interface RunPodApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RunPodUser {
  id: string;
  email: string;
  minBalance: number;
  balance: number;
}

export interface RunPodAccount {
  id: string;
  email: string;
  minBalance: number;
  balance: number;
  credits: number;
  totalSpent: number;
}

export interface RunPodAccountSummary {
  account: RunPodAccount;
  activePods: number;
  totalCost: number;
  monthlySpend: number;
}

export interface GpuType {
  id: string;
  displayName: string;
  memoryInGb: number;
  secureCloud: boolean;
  communityCloud: boolean;
  lowestPrice: {
    minimumBidPrice: number;
    uninterruptablePrice: number;
  };
}

export interface RunPodPod {
  id: string;
  name: string;
  runtime: {
    uptimeInSeconds: number;
    ports: Array<{
      ip: string;
      isIpPublic: boolean;
      privatePort: number;
      publicPort: number;
      type: string;
    }>;
    gpus: Array<{
      id: string;
      gpuUtilPercent: number;
      memoryUtilPercent: number;
    }>;
    container: {
      imageName: string;
      env: Array<{
        key: string;
        value: string;
      }>;
    };
  };
  machineId: string;
  machine: {
    podHostId: string;
    name: string;
  };
  desiredStatus: string;
  lastStatusChange: string;
  dockerId: string;
  dockerName: string;
  imageName: string;
  env: Array<{
    key: string;
    value: string;
  }>;
  containerDiskInGb: number;
  volumeInGb: number;
  volumeMountPath: string;
  ports: string;
  gpuIds: string[];
  networkVolumeId: string;
  templateId: string;
  idleTimeout: number;
  name: string;
  imageId: string;
  command: string;
  volumeMountPath: string;
  volumeInGb: number;
  containerDiskInGb: number;
  env: Array<{
    key: string;
    value: string;
  }>;
  ports: string;
  gpuIds: string[];
  networkVolumeId: string;
  templateId: string;
  idleTimeout: number;
  name: string;
  imageId: string;
  command: string;
}

export interface NetworkVolume {
  id: string;
  name: string;
  size: number;
  used: number;
  region: string;
  dataCenterId: string;
  networkVolumeType: string;
  templateId: string;
  userId: string;
  type: string;
  attachedPods: Array<{
    id: string;
    name: string;
  }>;
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
  gpuCount?: number;
  minMemoryInGb?: number;
  countryCode?: string;
  supportPublicIp?: boolean;
  minVcpuCount?: number;
  ports?: string[];
  templateId?: string;
  cloudType?: string;
  computeType?: string;
  vcpuCount?: number;
  dataCenterPriority?: string;
  gpuTypePriority?: string;
  cpuFlavorPriority?: string;
  minRamPerGpu?: number;
  minVcpuPerGpu?: number;
  interruptible?: boolean;
  locked?: boolean;
  globalNetworking?: boolean;
}

export interface PodRecruitmentConfig {
  gpuTypeIds: string[];
  imageName: string;
  name: string;
  env?: Record<string, string>;
  containerDiskInGb: number;
  volumeInGb?: number;
  volumeMountPath?: string;
  networkVolumeId?: string;
  gpuCount?: number;
  minMemoryInGb?: number;
  countryCode?: string;
  supportPublicIp?: boolean;
  minVcpuCount?: number;
  ports?: string[];
  templateId?: string;
  cloudType?: string;
  computeType?: string;
  vcpuCount?: number;
  dataCenterPriority?: string;
  gpuTypePriority?: string;
  cpuFlavorPriority?: string;
  minRamPerGpu?: number;
  minVcpuPerGpu?: number;
  interruptible?: boolean;
  locked?: boolean;
  globalNetworking?: boolean;
}

export interface WorkflowRequest {
  id: string;
  workflowName: string;
  requestData: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

export interface QueueStatus {
  isRunning: boolean;
  pendingRequests: number;
  processingRequests: number;
  completedRequests: number;
  failedRequests: number;
  totalRequests: number;
}