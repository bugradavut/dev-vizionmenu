"use client";

/**
 * Base API Client for VizionMenu
 * TypeScript-safe HTTP client with automatic auth handling
 */

import { supabase } from '@/lib/supabase';

export interface ApiResponse<T = unknown> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public error: ApiError,
    public response?: Response
  ) {
    super(error.detail || error.title);
    this.name = 'ApiClientError';
  }
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL?: string) {
    // Environment-based API URL selection
    if (baseURL) {
      this.baseURL = baseURL;
    } else {
      this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    }
  }

  private async getAuthToken(): Promise<string | null> {
    // Get token from Supabase session
    if (typeof window === 'undefined') return null;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getAuthToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle error responses
      if (!response.ok) {
        let errorData: ApiError;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            type: 'unknown_error',
            title: 'Unknown Error',
            status: response.status,
            detail: `HTTP ${response.status} - ${response.statusText}`,
          };
        }
        throw new ApiClientError(response.status, errorData, response);
      }

      // Handle empty responses (204 No Content)
      if (response.status === 204) {
        return { data: null as T };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      
      // Network or other errors
      throw new ApiClientError(0, {
        type: 'network_error',
        title: 'Network Error',
        status: 0,
        detail: error instanceof Error ? error.message : 'Unknown network error',
      });
    }
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const fullUrl = url.pathname + url.search;

    return this.request<T>(fullUrl, {
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();