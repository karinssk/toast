import type { ApiResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

class AdminApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: 'REQUEST_FAILED',
            message: 'Request failed',
          },
        };
      }

      return data;
    } catch (error) {
      console.error('Admin API request error:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
        },
      };
    }
  }

  // Auth
  async login(username: string, password: string) {
    return this.request<{
      token: string;
      admin: {
        id: string;
        username: string;
        email?: string | null;
        displayName: string;
        role: string;
      };
    }>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async getMe() {
    return this.request<{ admin: unknown }>('/admin/auth/me');
  }

  // Menus
  async listMenus(params?: {
    page?: number;
    limit?: number;
    search?: string;
    cuisineType?: string;
    isActive?: boolean;
    sortBy?: 'name' | 'cuisineType' | 'popularity' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.cuisineType) searchParams.set('cuisineType', params.cuisineType);
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const query = searchParams.toString();
    return this.request(`/admin/menus${query ? `?${query}` : ''}`);
  }

  async createMenu(data: Record<string, unknown>) {
    return this.request('/admin/menus', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMenu(id: string, data: Record<string, unknown>) {
    return this.request(`/admin/menus/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMenu(id: string) {
    return this.request(`/admin/menus/${id}`, {
      method: 'DELETE',
    });
  }

  async listCuisineTypes() {
    return this.request('/admin/menus/meta/cuisine-types');
  }

  // Restaurants
  async listRestaurants(params?: {
    page?: number;
    limit?: number;
    search?: string;
    priceLevel?: number;
    minRating?: number;
    isActive?: boolean;
    sortBy?: 'name' | 'priceLevel' | 'rating' | 'reviewCount' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.priceLevel) searchParams.set('priceLevel', String(params.priceLevel));
    if (params?.minRating) searchParams.set('minRating', String(params.minRating));
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const query = searchParams.toString();
    return this.request(`/admin/restaurants${query ? `?${query}` : ''}`);
  }

  async createRestaurant(data: Record<string, unknown>) {
    return this.request('/admin/restaurants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRestaurant(id: string, data: Record<string, unknown>) {
    return this.request(`/admin/restaurants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRestaurant(id: string) {
    return this.request(`/admin/restaurants/${id}`, {
      method: 'DELETE',
    });
  }

  // Sessions
  async listSessions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    mode?: string;
    sortBy?: 'createdAt' | 'startedAt' | 'completedAt';
    sortOrder?: 'asc' | 'desc';
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.mode) searchParams.set('mode', params.mode);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const query = searchParams.toString();
    return this.request(`/admin/sessions${query ? `?${query}` : ''}`);
  }

  async updateSessionStatus(id: string, status: string) {
    return this.request(`/admin/sessions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteSession(id: string) {
    return this.request(`/admin/sessions/${id}`, {
      method: 'DELETE',
    });
  }

  async getSessionStats() {
    return this.request('/admin/sessions/stats/overview');
  }
}

export const adminApi = new AdminApiClient();
