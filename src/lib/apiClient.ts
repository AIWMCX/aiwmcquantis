import { logger } from './logger';

/**
 * Custom API error with status code and response data
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }

  /**
   * Check if error is a specific status code
   */
  is(status: number): boolean {
    return this.statusCode === status;
  }

  /**
   * Check if error is a client error (4xx)
   */
  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Check if error is a server error (5xx)
   */
  isServerError(): boolean {
    return this.statusCode >= 500;
  }
}

interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Handle response and throw APIError on failure
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const error = new APIError(
      response.status,
      errorData?.message || errorData?.error || `Request failed: ${response.statusText}`,
      errorData
    );
    
    logger.error('API request failed', error, {
      component: 'apiClient',
      metadata: { 
        status: response.status, 
        url: response.url,
        statusText: response.statusText,
      },
    });
    
    throw error;
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Centralized API client with error handling and logging
 */
export const apiClient = {
  /**
   * GET request
   */
  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    logger.debug(`GET ${url}`, { component: 'apiClient', action: 'get' });
    
    const controller = new AbortController();
    const timeout = options?.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: options?.headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return handleResponse<T>(response);
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err instanceof APIError) {
        throw err;
      }
      
      if (err instanceof Error && err.name === 'AbortError') {
        throw new APIError(0, 'Request timeout', { timeout });
      }
      
      throw new APIError(0, err instanceof Error ? err.message : 'Network error', err);
    }
  },

  /**
   * POST request
   */
  async post<T>(url: string, body: unknown, options?: RequestOptions): Promise<T> {
    logger.debug(`POST ${url}`, { component: 'apiClient', action: 'post' });
    
    const controller = new AbortController();
    const timeout = options?.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return handleResponse<T>(response);
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err instanceof APIError) {
        throw err;
      }
      
      if (err instanceof Error && err.name === 'AbortError') {
        throw new APIError(0, 'Request timeout', { timeout });
      }
      
      throw new APIError(0, err instanceof Error ? err.message : 'Network error', err);
    }
  },

  /**
   * PUT request
   */
  async put<T>(url: string, body: unknown, options?: RequestOptions): Promise<T> {
    logger.debug(`PUT ${url}`, { component: 'apiClient', action: 'put' });
    
    const controller = new AbortController();
    const timeout = options?.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return handleResponse<T>(response);
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err instanceof APIError) {
        throw err;
      }
      
      throw new APIError(0, err instanceof Error ? err.message : 'Network error', err);
    }
  },

  /**
   * DELETE request
   */
  async delete<T>(url: string, options?: RequestOptions): Promise<T> {
    logger.debug(`DELETE ${url}`, { component: 'apiClient', action: 'delete' });
    
    const controller = new AbortController();
    const timeout = options?.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: options?.headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return handleResponse<T>(response);
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err instanceof APIError) {
        throw err;
      }
      
      throw new APIError(0, err instanceof Error ? err.message : 'Network error', err);
    }
  },
};

export type { RequestOptions };
