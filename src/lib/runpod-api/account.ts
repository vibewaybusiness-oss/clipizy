// RunPod Account API
export async function getAccountSummary() {
  try {
    const response = await fetch('/api/runpod/account');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('RunPod account error:', error);
    throw error;
  }
}

export async function getAccountInfo() {
  try {
    const response = await fetch('/api/runpod/account');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('RunPod account info error:', error);
    throw error;
  }
}
