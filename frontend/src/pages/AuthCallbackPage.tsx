import { useAuth } from '@hooks/useAuth';
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hydrateFromTokens } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      navigate('/login', { replace: true });
      return;
    }

    hydrateFromTokens(accessToken, refreshToken)
      .then(() => navigate('/dashboard/home', { replace: true }))
      .catch(() => navigate('/login', { replace: true }));
  }, [hydrateFromTokens, navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <p className="text-sm text-gray-500">Signing you in…</p>
      </div>
    </div>
  );
}
