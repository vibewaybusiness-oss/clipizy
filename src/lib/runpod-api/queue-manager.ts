// RunPod Queue Manager API
export async function getQueueManager() {
  try {
    const response = await fetch('/api/runpod/workflow');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('RunPod queue manager error:', error);
    throw error;
  }
}
