import { apiClient } from '@api/client';

export interface UrlInfo {
  shortUrl: string;
  destinationUrl: string;
  isActive: boolean;
  isExpired: boolean;
  expiresAt: string | null;
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

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
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

export interface ListUrlsParams {
  search?: string;
  isActive?: boolean;
  isExpired?: boolean;
  page?: number;
  pageSize?: number;
}

export async function urlInfoApi(shortUrl: string): Promise<UrlInfo> {
  const res = await apiClient.get<UrlInfo>(`/urls/${shortUrl}/info`);
  return res.data;
}

export async function listUrlsApi(
  params: ListUrlsParams = {}
): Promise<PaginatedResponse<UrlResponse>> {
  const res = await apiClient.get<PaginatedResponse<UrlResponse>>('/urls', { params });
  return res.data;
}

export async function listDestinationsApi(urlId: string): Promise<UrlDestinationResponse[]> {
  const res = await apiClient.get<UrlDestinationResponse[]>(`/urls/${urlId}/destinations`);
  return res.data;
}

export async function listClicksApi(
  urlId: string,
  destinationId: string,
  params: {
    page?: number;
    pageSize?: number;
  } = {}
): Promise<PaginatedResponse<UrlClickResponse>> {
  const res = await apiClient.get<PaginatedResponse<UrlClickResponse>>(
    `/urls/${urlId}/destinations/${destinationId}/clicks`,
    { params }
  );
  return res.data;
}

export interface UpdateUrlParams {
  isActive?: boolean;
  expiresAt?: string | null;
  comments?: string | null;
  destinationUrl?: string;
}

export async function updateUrlApi(id: string, params: UpdateUrlParams): Promise<UrlResponse> {
  const res = await apiClient.patch<UrlResponse>(`/urls/${id}`, params);
  return res.data;
}
