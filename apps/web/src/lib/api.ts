import { UniTrackApiClient, OfflineSyncEngine } from '@unitrack/api-client';

const envBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL;

export const api = new UniTrackApiClient({
  baseUrl:
    typeof envBaseUrl === 'string' && envBaseUrl.trim().length > 0
      ? envBaseUrl
      : typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port !== '3000'
        ? '' // Use Vite proxy on /api
        : (import.meta as any).env?.DEV
          ? 'http://localhost:3000'
          : '',
  clientType: 'web',
});

export const syncEngine = new OfflineSyncEngine({
  api,
  autoSyncOnReconnect: true,
});

