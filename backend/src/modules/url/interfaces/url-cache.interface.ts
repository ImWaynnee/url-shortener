export interface UrlCacheEntry {
  id: string;
  shortUrl: string;
  originalUrl: string;
  isActive: boolean;
  expiresAt: string | null;
  activeDestinationId: string | null;
}
