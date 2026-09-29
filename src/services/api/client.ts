/**
 * Centralized API Client for Fastflow Frontend.
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
    return localStorage.getItem('fastflow_auth_token');
  }

  public setToken(token: string): void {
    localStorage.setItem('fastflow_auth_token', token);
  }

  public clearToken(): void {
    localStorage.removeItem('fastflow_auth_token');
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
        if (response.status === 401) {
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fastflow:unauthorized'));
          }
        }
        const errorMsg = json?.message || `HTTP Error ${response.status}: ${response.statusText}`;
        const error = new Error(errorMsg) as Error & { status?: number; errors?: any; conflict?: boolean; current_restaurant?: any; new_restaurant?: any };
        error.status = response.status;
        error.errors = json?.errors;
        error.conflict = json?.conflict;
        error.current_restaurant = json?.current_restaurant;
        error.new_restaurant = json?.new_restaurant;
        throw error;
      }

      return json as ApiResponse<T>;
    } catch (err: any) {
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
