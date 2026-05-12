import { apiClient } from '@api/client';

export interface UrlInfo {
  shortUrl: string;
  originalUrl: string;
  isActive: boolean;
  isExpired: boolean;
  expiresAt: string | null;
}

export async function urlInfoApi(shortCode: string): Promise<UrlInfo> {
  const res = await apiClient.get<UrlInfo>(`/urls/${shortCode}/info`);
  return res.data;
}
