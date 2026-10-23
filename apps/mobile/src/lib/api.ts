import { UniTrackApiClient, TokenStorageAdapter } from '@unitrack/api-client';

class MobileStorageAdapter implements TokenStorageAdapter {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async getAccessToken(): Promise<string | null> {
    return this.accessToken;
  }

  async setAccessToken(token: string | null): Promise<void> {
    this.accessToken = token;
  }

  async getRefreshToken(): Promise<string | null> {
    return this.refreshToken;
  }

  async setRefreshToken(token: string | null): Promise<void> {
    this.refreshToken = token;
  }
}

export const mobileStorage = new MobileStorageAdapter();

export const mobileApi = new UniTrackApiClient({
  baseUrl: 'http://10.0.2.2:3000', // Standard Android emulator loopback to host
  clientType: 'mobile',
  storageAdapter: mobileStorage,
});
