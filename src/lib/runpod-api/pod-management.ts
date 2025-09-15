// RunPod Pod Management API
export async function recruitPod() {
  try {
    const response = await fetch('/api/runpod/pods/recruit', {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('RunPod recruit pod error:', error);
    throw error;
  }
}

export async function releasePod(podId: string) {
  try {
    const response = await fetch(`/api/runpod/pods/${podId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('RunPod release pod error:', error);
    throw error;
  }
}

export async function getPodStatus(podId: string) {
  try {
    const response = await fetch(`/api/runpod/pods/${podId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('RunPod pod status error:', error);
    throw error;
  }
}
