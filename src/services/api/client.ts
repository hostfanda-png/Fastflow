/**
 * Centralized API Client for DineFlow Frontend.
 * Interacts with Laravel REST API endpoints (/api/v1/*).
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string | null;
  meta?: Record<string, any>;
  errors?: Record<string, string[]>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private getToken(): string | null {
    return localStorage.getItem('dineflow_auth_token');
  }

  public setToken(token: string): void {
    localStorage.setItem('dineflow_auth_token', token);
  }

  public clearToken(): void {
    localStorage.removeItem('dineflow_auth_token');
  }

  public async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = json?.message || `HTTP Error ${response.status}: ${response.statusText}`;
        const error = new Error(errorMsg) as Error & { status?: number; errors?: any; conflict?: boolean };
        error.status = response.status;
        error.errors = json?.errors;
        error.conflict = json?.conflict;
        throw error;
      }

      return json as ApiResponse<T>;
    } catch (err: any) {
      // If network fails (e.g. standalone backend not running on port), we provide a fallback message
      if (!err.status) {
        console.warn(`[ApiClient] Network request to ${url} failed.`, err.message);
      }
      throw err;
    }
  }

  public get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          query.append(k, String(v));
        }
      });
      const queryString = query.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  public post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
