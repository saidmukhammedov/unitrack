import { UniTrackApiClient } from '@unitrack/api-client';

const envBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL;

export const api = new UniTrackApiClient({
  baseUrl:
    typeof envBaseUrl === 'string' && envBaseUrl.trim().length > 0
      ? envBaseUrl
      : (import.meta as any).env?.DEV
        ? 'http://localhost:3000'
        : '',
  clientType: 'web',
});
