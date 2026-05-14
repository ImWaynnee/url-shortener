import { apiClient } from '@api/client';
import { env } from '@config/env';
import axios, { type AxiosResponse } from 'axios';
import { useEffect, useRef, useState } from 'react';

const POLL_INTERVAL_MS = 60_000;

export function useHealthCheck() {
  const [isOnline, setIsOnline] = useState(true);
  // Ref so the interval callback can read the current value without a stale closure
  const isOnlineRef = useRef(true);

  function setOnline(value: boolean) {
    isOnlineRef.current = value;
    setIsOnline(value);
  }

  useEffect(() => {
    let cancelled = false;

    function doPing() {
      axios
        .get<{ message: string }>(`${env.VITE_API_BASE_URL}/ping`, { timeout: 5000 })
        .then(({ data }) => {
          if (!cancelled) setOnline(data?.message === 'pong!');
        })
        .catch(() => {
          if (!cancelled) setOnline(false);
        });
    }

    // One-time check on mount
    doPing();

    // Poll once per minute while offline
    const pollId = setInterval(() => {
      if (!isOnlineRef.current) doPing();
    }, POLL_INTERVAL_MS);

    // If any subsequent request through apiClient succeeds, the backend is reachable — remove the card
    const interceptorId = apiClient.interceptors.response.use(
      (response: AxiosResponse) => {
        setOnline(true);
        return response;
      },
      (error: unknown) => {
        // Even if the server returns 401 or 400, it's "Online"
        // Only set to false if there's no response (Network Error/Timeout)
        const hasResponse = axios.isAxiosError(error) && error.response;
        setOnline(!!hasResponse);
        return Promise.reject(error);
      }
    );

    return () => {
      cancelled = true;
      clearInterval(pollId);
      apiClient.interceptors.response.eject(interceptorId);
    };
  }, []);

  return { isOnline };
}
