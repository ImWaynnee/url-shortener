export interface CreateUrlResponse {
  shortUrl: string;
  destinationUrl: string;
  newUrl: string;
}

export interface UrlResponse {
  id: string;
  shortUrl: string;
  destinationUrl: string;
  comments: string | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  totalClicks: number;
  lastClickedAt: string | null;
}

export interface UrlInfoResponse {
  shortUrl: string;
  destinationUrl: string;
  isActive: boolean;
  isExpired: boolean;
  expiresAt: string | null;
}

export interface UrlDestinationResponse {
  id: string;
  destinationUrl: string | null;
  clickCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface UrlClickResponse {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  referrer: string | null;
  createdAt: string;
}
