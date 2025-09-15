// RunPod Client API
export async function fetchPods() {
  try {
    const response = await fetch('/api/runpod/pods');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('RunPod pods error:', error);
    throw error;
  }
}

export async function fetchPodById(podId: string) {
  try {
    const response = await fetch(`/api/runpod/pods/${podId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('RunPod pod error:', error);
    throw error;
  }
}

export async function fetchNetworkVolumes() {
  try {
    const response = await fetch('/api/runpod/networkvolumes');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('RunPod network volumes error:', error);
    throw error;
  }
}

export async function fetchNetworkVolumeById(volumeId: string) {
  try {
    const response = await fetch(`/api/runpod/networkvolumes/${volumeId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('RunPod network volume error:', error);
    throw error;
  }
}
