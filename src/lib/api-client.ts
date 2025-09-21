/**
 * Centralized API client for making requests to the backend
 */
import { getBackendUrl, getTimeout, BACKEND_CONFIG } from './config';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  signal?: AbortSignal;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  ok: boolean;
}

/**
 * Make an API request to the backend
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = BACKEND_CONFIG.timeouts.default,
    signal,
  } = options;

  const backendUrl = getBackendUrl();
  const url = `${backendUrl}${endpoint}`;

  // Create abort controller for timeout
  const controller = signal || new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller,
    };

    // Add body for non-GET requests
    if (body && method !== 'GET') {
      if (body instanceof FormData) {
        // For FormData, don't set Content-Type header
        delete requestOptions.headers!['Content-Type'];
        requestOptions.body = body;
      } else {
        requestOptions.body = JSON.stringify(body);
      }
    }

    console.log(`API Request: ${method} ${url}`);

    const response = await fetch(url, requestOptions);

    clearTimeout(timeoutId);

    console.log(`API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    return {
      data,
      status: response.status,
      ok: response.ok,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }

    throw new Error('Unknown API error');
  }
}

/**
 * Make a GET request
 */
export async function apiGet<T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * Make a POST request
 */
export async function apiPost<T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method'>): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'POST', body });
}

/**
 * Make a PUT request
 */
export async function apiPut<T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method'>): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'PUT', body });
}

/**
 * Make a PATCH request
 */
export async function apiPatch<T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method'>): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'PATCH', body });
}

/**
 * Make a DELETE request
 */
export async function apiDelete<T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
}

/**
 * Upload a file with FormData
 */
export async function apiUpload<T = any>(
  endpoint: string,
  formData: FormData,
  options?: Omit<ApiRequestOptions, 'method' | 'body' | 'headers'>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: formData,
    timeout: getTimeout('upload'),
    headers: {}, // Don't set Content-Type for FormData
  });
}
