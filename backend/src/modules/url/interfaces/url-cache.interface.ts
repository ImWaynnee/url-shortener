export interface UrlCacheEntry {
  id: string;
  shortUrl: string;
  destinationUrl: string;
  isActive: boolean;
  expiresAt: string | null;
  activeDestinationId: string | null;
}
