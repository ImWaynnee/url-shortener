import { apiClient } from '@api/client';
import { env } from '@config/env';
import axios, { type AxiosResponse } from 'axios';
import { useEffect, useState } from 'react';

export function useHealthCheck() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // One-time check on mount
    axios
      .get<{ message: string }>(`${env.apiBaseUrl}/ping`, { timeout: 5000 })
      .then(({ data }) => {
        if (!cancelled) setIsOnline(data?.message === 'pong!');
      })
      .catch(() => {
        if (!cancelled) setIsOnline(false);
      });

    // If any subsequent request through apiClient succeeds, the backend is reachable — remove the card
    const interceptorId = apiClient.interceptors.response.use(
      (response: AxiosResponse) => {
        setIsOnline(true);
        return response;
      },
      (error: unknown) => {
        // Even if the server returns 401 or 400, it's "Online"
        // Only set to false if there's no response (Network Error/Timeout)
        const hasResponse = axios.isAxiosError(error) && error.response;
        if (hasResponse) {
          setIsOnline(true);
        } else {
          setIsOnline(false);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      cancelled = true;
      apiClient.interceptors.response.eject(interceptorId);
    };
  }, []);

  return { isOnline };
}
