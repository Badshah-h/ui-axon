import { errorMonitoring } from './error-monitoring';

export interface APIClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  cache?: boolean;
  cacheTimeout?: number;
}

export interface APIResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface APIError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class APIClient {
  private config: Required<APIClientConfig>;
  private cache = new Map<string, CacheEntry<any>>();
  private requestInterceptors: Array<(config: RequestInit) => RequestInit | Promise<RequestInit>> = [];
  private responseInterceptors: Array<(response: Response) => Response | Promise<Response>> = [];
  private authToken?: string;

  constructor(config: APIClientConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      cache: true,
      cacheTimeout: 300000, // 5 minutes
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    };

    // Setup default interceptors
    this.setupDefaultInterceptors();
  }

  private setupDefaultInterceptors(): void {
    // Request interceptor for auth
    this.addRequestInterceptor((config) => {
      if (this.authToken) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${this.authToken}`,
        };
      }
      return config;
    });

    // Response interceptor for error handling
    this.addResponseInterceptor(async (response) => {
      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        throw new APIError({
          message: errorData.message || response.statusText,
          status: response.status,
          code: errorData.code,
          details: errorData,
        });
      }
      return response;
    });
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = undefined;
  }

  addRequestInterceptor(
    interceptor: (config: RequestInit) => RequestInit | Promise<RequestInit>
  ): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(
    interceptor: (response: Response) => Response | Promise<Response>
  ): void {
    this.responseInterceptors.push(interceptor);
  }

  private async parseErrorResponse(response: Response): Promise<any> {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      }
      return { message: await response.text() };
    } catch {
      return { message: response.statusText };
    }
  }

  private generateCacheKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  private getCachedResponse<T>(cacheKey: string): T | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data;
  }

  private setCachedResponse<T>(cacheKey: string, data: T): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.cacheTimeout,
    };
    this.cache.set(cacheKey, entry);

    // Cleanup old entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async executeRequest<T>(
    url: string,
    options: RequestInit,
    attempt = 1
  ): Promise<APIResponse<T>> {
    const fullUrl = url.startsWith('http') ? url : `${this.config.baseURL}${url}`;
    
    try {
      // Apply request interceptors
      let finalOptions = { ...options };
      for (const interceptor of this.requestInterceptors) {
        finalOptions = await interceptor(finalOptions);
      }

      // Add default headers
      finalOptions.headers = {
        ...this.config.headers,
        ...finalOptions.headers,
      };

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      finalOptions.signal = controller.signal;

      const response = await fetch(fullUrl, finalOptions);
      clearTimeout(timeoutId);

      // Apply response interceptors
      let finalResponse = response;
      for (const interceptor of this.responseInterceptors) {
        finalResponse = await interceptor(finalResponse);
      }

      const data = await this.parseResponse<T>(finalResponse);

      return {
        data,
        status: finalResponse.status,
        statusText: finalResponse.statusText,
        headers: Object.fromEntries(finalResponse.headers.entries()),
      };

    } catch (error) {
      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new APIError({
          message: 'Request timeout',
          status: 408,
          code: 'TIMEOUT',
        });
        
        errorMonitoring.captureAPIError(
          timeoutError.message,
          fullUrl,
          options.method || 'GET',
          408
        );
        
        throw timeoutError;
      }

      // Handle network errors and retries
      if (attempt < this.config.retries && this.shouldRetry(error)) {
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        await this.sleep(delay);
        return this.executeRequest<T>(url, options, attempt + 1);
      }

      // Log error
      const apiError = error instanceof APIError ? error : new APIError({
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'NETWORK_ERROR',
      });

      errorMonitoring.captureAPIError(
        apiError.message,
        fullUrl,
        options.method || 'GET',
        apiError.status
      );

      throw apiError;
    }
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors or 5xx status codes
    if (error instanceof APIError) {
      return !error.status || error.status >= 500;
    }
    return true; // Retry on network errors
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    
    if (contentType?.includes('text/')) {
      return await response.text() as unknown as T;
    }
    
    return await response.blob() as unknown as T;
  }

  async get<T = any>(url: string, options: Omit<RequestInit, 'method'> = {}): Promise<APIResponse<T>> {
    const cacheKey = this.generateCacheKey(url, { ...options, method: 'GET' });
    
    // Check cache for GET requests
    if (this.config.cache && options.method !== 'POST') {
      const cached = this.getCachedResponse<APIResponse<T>>(cacheKey);
      if (cached) return cached;
    }

    const response = await this.executeRequest<T>(url, { ...options, method: 'GET' });
    
    // Cache successful GET responses
    if (this.config.cache && response.status < 400) {
      this.setCachedResponse(cacheKey, response);
    }
    
    return response;
  }

  async post<T = any>(url: string, data?: any, options: Omit<RequestInit, 'method' | 'body'> = {}): Promise<APIResponse<T>> {
    return this.executeRequest<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(url: string, data?: any, options: Omit<RequestInit, 'method' | 'body'> = {}): Promise<APIResponse<T>> {
    return this.executeRequest<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(url: string, data?: any, options: Omit<RequestInit, 'method' | 'body'> = {}): Promise<APIResponse<T>> {
    return this.executeRequest<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(url: string, options: Omit<RequestInit, 'method'> = {}): Promise<APIResponse<T>> {
    return this.executeRequest<T>(url, { ...options, method: 'DELETE' });
  }

  // Upload file with progress tracking
  async upload<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    options: Omit<RequestInit, 'method' | 'body'> = {}
  ): Promise<APIResponse<T>> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({
              data,
              status: xhr.status,
              statusText: xhr.statusText,
              headers: {},
            });
          } catch {
            resolve({
              data: xhr.responseText as unknown as T,
              status: xhr.status,
              statusText: xhr.statusText,
              headers: {},
            });
          }
        } else {
          reject(new APIError({
            message: xhr.statusText,
            status: xhr.status,
          }));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new APIError({
          message: 'Upload failed',
          code: 'UPLOAD_ERROR',
        }));
      });

      const fullUrl = url.startsWith('http') ? url : `${this.config.baseURL}${url}`;
      xhr.open('POST', fullUrl);

      // Add auth header if available
      if (this.authToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.authToken}`);
      }

      xhr.send(formData);
    });
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Custom error class
class APIError extends Error {
  public status?: number;
  public code?: string;
  public details?: any;

  constructor({ message, status, code, details }: {
    message: string;
    status?: number;
    code?: string;
    details?: any;
  }) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Create default API client instance
export const apiClient = new APIClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  cache: true,
  cacheTimeout: 300000,
});

// Workflow-specific API methods
export const workflowAPI = {
  // Workflows
  getWorkflows: () => apiClient.get('/workflows'),
  getWorkflow: (id: string) => apiClient.get(`/workflows/${id}`),
  createWorkflow: (data: any) => apiClient.post('/workflows', data),
  updateWorkflow: (id: string, data: any) => apiClient.put(`/workflows/${id}`, data),
  deleteWorkflow: (id: string) => apiClient.delete(`/workflows/${id}`),
  
  // Workflow execution
  executeWorkflow: (id: string, input?: any) => apiClient.post(`/workflows/${id}/execute`, { input }),
  getExecution: (workflowId: string, executionId: string) => 
    apiClient.get(`/workflows/${workflowId}/executions/${executionId}`),
  getExecutions: (workflowId: string) => apiClient.get(`/workflows/${workflowId}/executions`),
  cancelExecution: (workflowId: string, executionId: string) => 
    apiClient.post(`/workflows/${workflowId}/executions/${executionId}/cancel`),
  
  // Agents
  getAgents: () => apiClient.get('/agents'),
  getAgent: (id: string) => apiClient.get(`/agents/${id}`),
  createAgent: (data: any) => apiClient.post('/agents', data),
  updateAgent: (id: string, data: any) => apiClient.put(`/agents/${id}`, data),
  deleteAgent: (id: string) => apiClient.delete(`/agents/${id}`),
  testAgent: (id: string, message: string) => apiClient.post(`/agents/${id}/test`, { message }),
  
  // Tools
  getTools: () => apiClient.get('/tools'),
  getTool: (id: string) => apiClient.get(`/tools/${id}`),
  createTool: (data: any) => apiClient.post('/tools', data),
  updateTool: (id: string, data: any) => apiClient.put(`/tools/${id}`, data),
  deleteTool: (id: string) => apiClient.delete(`/tools/${id}`),
  testTool: (id: string, params: any) => apiClient.post(`/tools/${id}/test`, params),
  
  // Templates
  getTemplates: () => apiClient.get('/templates'),
  getTemplate: (id: string) => apiClient.get(`/templates/${id}`),
  createFromTemplate: (id: string, data: any) => apiClient.post(`/templates/${id}/create`, data),
  
  // Integrations
  getIntegrations: () => apiClient.get('/integrations'),
  getIntegration: (id: string) => apiClient.get(`/integrations/${id}`),
  createIntegration: (data: any) => apiClient.post('/integrations', data),
  updateIntegration: (id: string, data: any) => apiClient.put(`/integrations/${id}`, data),
  deleteIntegration: (id: string) => apiClient.delete(`/integrations/${id}`),
  testIntegration: (id: string) => apiClient.post(`/integrations/${id}/test`),
};

export { APIError };