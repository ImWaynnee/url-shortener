export interface CreateUrlResponse {
  shortUrl: string;
  originalUrl: string;
  newUrl: string;
}

export interface UrlResponse {
  id: string;
  shortUrl: string;
  originalUrl: string;
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
  originalUrl: string;
  isActive: boolean;
  isExpired: boolean;
  expiresAt: string | null;
}

export interface UrlDestinationResponse {
  id: string;
  destinationUrl: string | null;
  isActive: boolean;
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

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
