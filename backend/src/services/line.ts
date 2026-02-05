import { env } from '../config/env.js';

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LineTokenVerifyResponse {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  nonce?: string;
  amr?: string[];
  name?: string;
  picture?: string;
  email?: string;
}

export class LineService {
  private channelId: string;

  constructor() {
    this.channelId = env.LINE_CHANNEL_ID;
  }

  /**
   * Verify LINE ID token and return user profile
   */
  async verifyIdToken(idToken: string): Promise<LineProfile> {
    const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: this.channelId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('LINE token verification failed:', error);
      throw new Error('Invalid LINE ID token');
    }

    const data = (await response.json()) as LineTokenVerifyResponse;

    // Validate audience (channel ID)
    if (data.aud !== this.channelId) {
      throw new Error('Invalid token audience');
    }

    // Check expiration
    if (data.exp * 1000 < Date.now()) {
      throw new Error('Token expired');
    }

    return {
      userId: data.sub,
      displayName: data.name || 'LINE User',
      pictureUrl: data.picture,
    };
  }

  /**
   * Get user profile using access token
   */
  async getUserProfile(accessToken: string): Promise<LineProfile> {
    const response = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get LINE profile');
    }

    const data = (await response.json()) as LineProfile;

    return {
      userId: data.userId,
      displayName: data.displayName,
      pictureUrl: data.pictureUrl,
      statusMessage: data.statusMessage,
    };
  }
}

export const lineService = new LineService();
