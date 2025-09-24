/**
 * Legacy API Client - use BaseApiClient for new services
 * @deprecated Use BaseApiClient from './base' instead
 */
import { BaseApiClient } from './base';

import { getBackendUrl } from '@/lib/config';

// Use backend URL directly to bypass Next.js API route issues
const API_BASE_URL = getBackendUrl();

export class APIClient extends BaseApiClient {
  constructor() {
    super(API_BASE_URL);
  }

  static async get<T>(endpoint: string): Promise<T> {
    const client = new APIClient();
    return client.get<T>(endpoint);
  }

  static async post<T>(endpoint: string, data?: any): Promise<T> {
    const client = new APIClient();
    return client.post<T>(endpoint, data);
  }

  static async put<T>(endpoint: string, data?: any): Promise<T> {
    const client = new APIClient();
    return client.put<T>(endpoint, data);
  }

  static async delete<T>(endpoint: string): Promise<T> {
    const client = new APIClient();
    return client.delete<T>(endpoint);
  }

  static async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    const client = new APIClient();
    return client.uploadFile<T>(endpoint, file, additionalData);
  }
}

export default APIClient;
