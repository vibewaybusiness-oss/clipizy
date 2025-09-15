// Ollama API client
export const ollamaAPI = {
  async generate(prompt: string, model: string = 'llama3.1') {
    try {
      const response = await fetch('/api/ollama', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Ollama API error:', error);
      throw error;
    }
  },

  async listModels() {
    try {
      const response = await fetch('/api/ollama');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Ollama models error:', error);
      throw error;
    }
  }
};
