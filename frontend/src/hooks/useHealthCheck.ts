import { env } from '@config/env';
import axios from 'axios';
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

    // If any subsequent request succeeds, the backend is reachable — remove the card
    const interceptorId = axios.interceptors.response.use(
      (response) => {
        // Check if the URL belongs to your backend
        if (response.config.url?.startsWith(env.apiBaseUrl)) {
          setIsOnline(true);
        }
        return response;
      },
      (error) => {
        // Even if the server returns 401 or 400, it's "Online"
        // Only set to false if there's no response (Network Error/Timeout)
        if (error.config?.url?.startsWith(env.apiBaseUrl)) {
          if (!error.response) {
            setIsOnline(false);
          } else {
            // Server responded with a code (4xx, 5xx), so it's reachable
            setIsOnline(true);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      cancelled = true;
      axios.interceptors.response.eject(interceptorId);
    };
  }, []);

  return { isOnline };
}
