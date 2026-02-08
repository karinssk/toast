import type { ApiResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    // Ensure POST/PATCH/PUT requests always have a body to avoid Fastify 400 errors
    const method = options.method?.toUpperCase();
    if ((method === 'POST' || method === 'PATCH' || method === 'PUT') && !options.body) {
      options.body = JSON.stringify({});
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
      console.error('API request error:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
        },
      };
    }
  }

  // Auth endpoints
  async loginWithLine(idToken: string, liffId?: string) {
    return this.request<{
      accessToken: string;
      expiresIn: number;
      user: {
        id: string;
        lineUserId: string;
        displayName: string;
        pictureUrl: string | null;
        onboardingDone: boolean;
        preferences: unknown;
      };
    }>('/auth/line', {
      method: 'POST',
      body: JSON.stringify({ idToken, liffId }),
    });
  }

  async refreshToken() {
    return this.request<{ accessToken: string; expiresIn: number }>('/auth/refresh', {
      method: 'POST',
    });
  }

  // User endpoints
  async getMe() {
    return this.request<{
      id: string;
      displayName: string;
      pictureUrl: string | null;
      preferences: unknown;
      onboardingStep: number;
      onboardingDone: boolean;
    }>('/users/me');
  }

  async updateMe(data: { displayName?: string; preferences?: unknown }) {
    return this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async completeOnboarding() {
    return this.request('/users/me/onboarding/complete', {
      method: 'POST',
    });
  }

  // Session endpoints
  async createSession(mode: 'SOLO' | 'GROUP', filters: unknown) {
    return this.request<{
      id: string;
      code: string;
      mode: string;
      status: string;
      inviteUrl: string;
      owner: unknown;
      members: unknown[];
      filters: unknown;
    }>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ mode, filters }),
    });
  }

  async getSession(sessionId: string) {
    return this.request(`/sessions/${sessionId}`);
  }

  async joinSession(code: string) {
    return this.request<{
      sessionId: string;
      alreadyMember: boolean;
      session: unknown;
    }>('/sessions/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async startSession(sessionId: string) {
    return this.request<{
      sessionId: string;
      status: string;
      deck: unknown[];
    }>(`/sessions/${sessionId}/start`, {
      method: 'POST',
    });
  }

  async continueSession(sessionId: string) {
    return this.request<{
      sessionId: string;
      phase: string;
      deck: unknown[];
    }>(`/sessions/${sessionId}/continue`, {
      method: 'POST',
    });
  }

  async leaveSession(sessionId: string) {
    return this.request(`/sessions/${sessionId}/leave`, {
      method: 'POST',
    });
  }

  async getSessionResult(sessionId: string) {
    return this.request(`/sessions/${sessionId}/result`);
  }

  // Menu endpoints
  async getMenus(params?: {
    cuisines?: string[];
    priceMin?: number;
    priceMax?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.cuisines?.length) {
      searchParams.set('cuisines', params.cuisines.join(','));
    }
    if (params?.priceMin) searchParams.set('priceMin', String(params.priceMin));
    if (params?.priceMax) searchParams.set('priceMax', String(params.priceMax));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    return this.request(`/menus${query ? `?${query}` : ''}`);
  }

  async getRestaurantsForMenu(
    menuId: string,
    params: { lat: number; lng: number; maxDistance?: number }
  ) {
    const searchParams = new URLSearchParams({
      lat: String(params.lat),
      lng: String(params.lng),
    });
    if (params.maxDistance) {
      searchParams.set('maxDistance', String(params.maxDistance));
    }

    return this.request(`/menus/${menuId}/restaurants?${searchParams.toString()}`);
  }

  // Analytics
  async trackEvents(events: Array<{ eventType: string; sessionId?: string; payload?: unknown }>) {
    return this.request('/analytics/events/batch', {
      method: 'POST',
      body: JSON.stringify({ events }),
    });
  }
}

export const api = new ApiClient();
