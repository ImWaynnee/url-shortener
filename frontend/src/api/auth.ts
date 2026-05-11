import { apiClient } from '@api/client';
import { env } from '@config/env';

/**
 * SHA-256 hash via the native Web Crypto API so the raw password never leaves the browser.
 */
async function hashPassword(plain: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  fullName?: string;
}

export async function loginApi(email: string, password: string): Promise<AuthTokenResponse> {
  const passwordHash = await hashPassword(password);
  const { data } = await apiClient.post<AuthTokenResponse>('/auth/login', {
    email,
    password: passwordHash,
  });
  return data;
}

export async function registerApi(
  email: string,
  password: string,
  fullName?: string,
): Promise<AuthTokenResponse> {
  const passwordHash = await hashPassword(password);
  const { data } = await apiClient.post<AuthTokenResponse>('/auth/register', {
    email,
    password: passwordHash,
    ...(fullName ? { fullName } : {}),
  });
  return data;
}

export async function meApi(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/auth/me');
  return data;
}

export function googleOAuthUrl(): string {
  return `${env.apiBaseUrl}/auth/google`;
}
