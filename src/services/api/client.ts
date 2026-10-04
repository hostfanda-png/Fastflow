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

const RAW_API_BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').trim();

/**
 * Normalize API base URL:
 * - If an absolute URL is provided without an /api/v1 path (e.g. "https://api.fastflow.app" or "http://127.0.0.1:8000"),
 *   automatically append "/api/v1".
 * - Strip trailing slashes.
 */
export function resolveApiBaseUrl(rawUrl: string = RAW_API_BASE_URL): string {
  const cleaned = (rawUrl || '/api/v1').trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(cleaned)) {
    try {
      const parsed = new URL(cleaned);
      if (parsed.pathname === '' || parsed.pathname === '/') {
        return `${cleaned}/api/v1`;
      }
    } catch {
      // Fallback to cleaned string
    }
  }
  return cleaned || '/api/v1';
}

const API_BASE_URL = resolveApiBaseUrl();

export interface ApiClientError extends Error {
  status?: number;
  code?: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'BACKEND_UNREACHABLE' | 'CONFLICT' | 'VALIDATION_ERROR' | 'SERVER_ERROR' | 'NETWORK_ERROR';
  errors?: Record<string, string[]>;
  conflict?: boolean;
  current_restaurant?: any;
  new_restaurant?: any;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
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

  private extractValidationMessage(json: any): string | null {
    if (json?.errors && typeof json.errors === 'object') {
      const firstFieldErrors = Object.values(json.errors).find(
        (val) => Array.isArray(val) && val.length > 0 && typeof val[0] === 'string'
      ) as string[] | undefined;
      if (firstFieldErrors && firstFieldErrors[0]) {
        return firstFieldErrors[0];
      }
    }
    return json?.message || null;
  }

  public async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const base = this.baseUrl.replace(/\/+$/, '');
    let path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Prevent accidental duplicate prefix (e.g. /api/v1/api/v1/...)
    if (base.endsWith('/api/v1') && (path === '/api/v1' || path.startsWith('/api/v1/'))) {
      path = path.substring(7) || '/';
    }

    const url = `${base}${path}`;
    const token = this.getToken();

    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const json = isJson ? await response.json().catch(() => null) : await response.json().catch(() => null);

      if (!response.ok) {
        const status = response.status;
        let errorMsg = json?.message || '';
        let errorCode: ApiClientError['code'] = 'SERVER_ERROR';

        if (status === 401) {
          errorCode = 'UNAUTHENTICATED';
          // Only clear stored token & emit session expiry if this was not a login attempt
          if (!path.startsWith('/auth/login')) {
            this.clearToken();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('fastflow:unauthorized'));
            }
          }
          errorMsg = errorMsg || 'Authentication failed (401). Please verify your credentials or sign in again.';
        } else if (status === 403) {
          errorCode = 'FORBIDDEN';
          errorMsg = errorMsg || 'Authorization failed (403): You do not have permission to perform this action.';
        } else if (status === 404) {
          // Distinguish between a real Laravel JSON 404 response vs. an unproxied SPA/Vite HTML 404
          if (!json || typeof json.success !== 'boolean') {
            errorCode = 'BACKEND_UNREACHABLE';
            errorMsg = `Laravel API endpoint (${url}) returned HTTP 404 without a JSON payload. The Laravel backend server is not running or VITE_API_URL / VITE_BACKEND_URL is not connected to a live Laravel instance.`;
          } else {
            errorCode = 'NOT_FOUND';
            errorMsg = errorMsg || `Requested resource or endpoint (${path}) was not found (404).`;
          }
        } else if (status === 409) {
          errorCode = 'CONFLICT';
          errorMsg = errorMsg || 'Request could not be completed due to a resource conflict (409).';
        } else if (status === 422) {
          errorCode = 'VALIDATION_ERROR';
          errorMsg = this.extractValidationMessage(json) || 'Validation or business rule check failed (422).';
        } else if (status >= 500) {
          errorCode = 'SERVER_ERROR';
          // Never expose internal SQL or stack trace details even if server sends them
          const rawMsg = typeof json?.message === 'string' ? json.message : '';
          const isSafeMsg = rawMsg && !/SQLSTATE|Stack trace|vendor\/|Exception in/i.test(rawMsg);
          errorMsg = isSafeMsg
            ? rawMsg
            : `Backend server error (${status}). Ensure the Laravel API server and database are running.`;
        } else {
          errorMsg = errorMsg || `HTTP Error ${status}: ${response.statusText || 'Request failed'}`;
        }

        const error = new Error(errorMsg) as ApiClientError;
        error.status = status;
        error.code = errorCode;
        error.errors = json?.errors;
        error.conflict = json?.conflict;
        error.current_restaurant = json?.current_restaurant;
        error.new_restaurant = json?.new_restaurant;
        throw error;
      }

      // Guard against 200 HTML fallback (e.g. SPA fallback returning index.html for /api/v1/*)
      if (!json || typeof json !== 'object') {
        const error = new Error(
          `Invalid non-JSON response received from ${url}. Ensure VITE_API_URL points to a running Laravel API.`
        ) as ApiClientError;
        error.status = 502;
        error.code = 'BACKEND_UNREACHABLE';
        throw error;
      }

      return json as ApiResponse<T>;
    } catch (err: any) {
      if (!err.status) {
        const netError = new Error(
          `Unable to reach the Fastflow Laravel API (${url}). Please verify the backend server is running and VITE_API_URL is configured.`
        ) as ApiClientError;
        netError.code = 'NETWORK_ERROR';
        console.warn(`[ApiClient] Network request to ${url} failed.`, err.message);
        throw netError;
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

  public post<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
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
