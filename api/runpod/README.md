# RunPod Backend Integration

This directory contains the RunPod GraphQL API integration for the WaveClip application with advanced pod management capabilities.

## Directory Structure


```
backend/
├── runpod-api/           # RunPod API module
│   ├── client.ts         # GraphQL API client
│   ├── account.ts        # Account management utilities
│   ├── pod-management.ts # Pod recruitment and management
│   ├── index.ts          # Main exports
│   └── test-pod-management.ts # Pod management tests
├── finalTest.ts          # Complete integration test
├── README.md             # This file
├── runpod_api_key        # SSH private key for pod connections
└── runpod_api_key.pub    # SSH public key for pod connections
```

## Usage

### Basic Account Information

```typescript
import { getAccountInfo } from './backend/accountUtils';

const account = await getAccountInfo();
console.log(account);
// Output: { id: "user_xxx", email: "user@example.com", minBalance: 0 }
```

### Account Summary

```typescript
import { getAccountSummary } from './backend/accountUtils';

const summary = await getAccountSummary();
console.log(`Account: ${summary.account?.email}`);
console.log(`Active Pods: ${summary.activePods}`);
console.log(`Total Cost: $${summary.totalCost}`);
```

### GPU Types

```typescript
import { fetchGpuTypes } from './backend/runpodGraphQLClient';

const gpuResult = await fetchGpuTypes();
if (gpuResult.success) {
  console.log(`Found ${gpuResult.data.length} GPU types`);
  gpuResult.data.forEach(gpu => console.log(gpu.id));
}
```

### API Routes

The integration provides Next.js API routes:

- `GET /api/runpod/account` - Get account information
- `GET /api/runpod/account?summary=true` - Get account summary
- `GET /api/runpod/pods` - Get all pods (limited by API)
- `GET /api/runpod/pods?id=POD_ID` - Get specific pod

## Testing

Run the complete integration test:

```bash
npm run runpod:final
```

### **Test Commands:**
- `npm run runpod:final` - Complete integration test
- `npm run runpod:test-pods` - Pod management test
- `npm run runpod:test-recruitment` - Full recruitment scenario (1 pod → close → 2 pods → close)
- `npm run runpod:test-community` - Community cloud specific test
- `npm run runpod:summary` - Integration summary and status
- `npm run runpod:test` - Test SSH connection to RunPod pods

## Authentication

The integration uses a RunPod API key for authentication. You have two options:

### Option 1: Environment Variable (Recommended)
Set the `RUNPOD_API_KEY` environment variable:
```bash
export RUNPOD_API_KEY="your-api-key-here"
```

### Option 2: Setup Script
Run the setup script to configure your API key:
```bash
npm run runpod:setup
```

### Getting Your API Key
1. Go to https://runpod.io/
2. Log in to your account
3. Go to Settings > API Keys
4. Generate a new API key

**Note:** The SSH key files (`runpod_api_key` and `runpod_api_key.pub`) are used for connecting to the actual pods, not for the REST API authentication.

## Available Functions

### Account Management
- `getAccountInfo()` - Get basic account information (GraphQL)
- `getAccountSummary()` - Get comprehensive account summary
- `getActivePods()` - Get only running pods (limited by API)

### Pod Management
- `fetchPods()` - Get all pods (not supported by current API)
- `fetchPodById(id)` - Get specific pod by ID
- `createPod(config)` - Create new pod
- `stopPod(id)` - Stop running pod
- `startPod(id)` - Start stopped pod
- `terminatePod(id)` - Terminate pod

### Resource Information
- `fetchGpuTypes()` - Get available GPU types (40+ types available)
- `fetchCloudTypes()` - Get available cloud storage types

## API Limitations

- **Pod Listing**: The RunPod GraphQL API doesn't support listing all pods. You can only get specific pods by ID.
- **Limited Fields**: GPU types only return ID field, not detailed specifications.
- **Cloud Storage**: Currently returns empty array (no cloud storage configured).

## Working Features

✅ **Account Information** - User ID, email, balance  
✅ **GPU Types** - 40+ available GPU types  
✅ **Pod Management** - Create, start, stop, terminate pods  
✅ **Community Cloud Support** - Optimized for community cloud instances  
✅ **GPU Priority System** - A40 > 4090 > 5090 (RTX 3090 for community)  
✅ **Authentication** - API key-based authentication  
✅ **Error Handling** - Comprehensive error handling  
✅ **TypeScript Support** - Full type definitions

## Community Cloud Support

The integration now supports RunPod's community cloud with the following optimizations:

### **Community Cloud Configuration:**
```typescript
const config = {
  name: 'my-pod',
  imageName: 'runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04',
  cloudType: 'COMMUNITY',
  gpuCount: 1,
  minMemoryInGb: 24,
  countryCode: 'CA', // or 'US', 'EU'
  supportPublicIp: true
};
```

### **GPU Priority for Community Cloud:**
1. NVIDIA GeForce RTX 3090 (most available)
2. NVIDIA GeForce RTX 3080
3. NVIDIA GeForce RTX 3070
4. NVIDIA A40
5. NVIDIA GeForce RTX 4090

### **Key Benefits:**
- **Better Availability** - Community cloud often has more available instances
- **Cost Effective** - Community instances are typically cheaper
- **Optimized GPU Selection** - Prioritizes RTX 3090 which is more available
- **Flexible Configuration** - Supports memory, country, and public IP settings
- **✅ WORKING** - Successfully tested and confirmed working with real pod creation

### **Required Parameters:**
The integration now includes all required parameters for successful pod creation:
- `containerDiskInGb: 20` - Container disk size
- `minVcpuCount: 4 * gpuCount` - Minimum vCPUs (4 per GPU)
- `ports: "22,8080,8888"` - Exposed ports
- `dockerArgs: ""` - Docker arguments
- `supportPublicIp: true` - Enable public IP access

### **Pod Management:**
- ✅ **Pause Pods** - Uses `podStop` GraphQL mutation to pause pods (EXITED status)
- ✅ **Terminate Pods** - Uses REST API DELETE to permanently delete pods
- ✅ **List Pods** - Uses REST API GET to list all current pods
- ✅ **Tested** - Successfully tested pause and terminate operations
- ✅ **Community Cloud** - Optimized for community cloud instances

### **Workflow Queue System:**
- ✅ **Queue Management** - Automatic pod allocation based on workflow type
- ✅ **Network Volume Mounting** - Persistent storage for all pods
- ✅ **Workflow-Specific Timeouts** - Configurable timeouts per workflow type
- ✅ **Auto-Pause System** - Pods pause after timeout if no new requests
- ✅ **REST API Integration** - Full API endpoints for workflow execution

### **Workflow Types Supported:**
- **DeepSeek** - 30 second timeout (text generation)
- **ComfyUI** - 10 second timeout (image generation)
- **ImageGeneration** - 10 second timeout (AI image creation)
- **VideoGeneration** - 15 second timeout (video creation)
- **TextGeneration** - 30 second timeout (general text)
- **AudioGeneration** - 20 second timeout (audio processing)

### **API Endpoints:**
- `POST /api/runpod/workflow` - Submit workflow request
- `GET /api/runpod/workflow` - Get queue status
- `DELETE /api/runpod/workflow` - Stop queue manager

### **Available Commands:**
- `npm run runpod:test-workflow` - Test workflow queue system
- `npm run runpod:test-recruitment` - Full recruitment scenario test
- `npm run runpod:test-community` - Community cloud test
