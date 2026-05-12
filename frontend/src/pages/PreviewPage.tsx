import { type UrlInfo,urlInfoApi } from '@api/url';
import { Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

export function PreviewPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [info, setInfo] = useState<UrlInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!code) return;
    urlInfoApi(code)
      .then(setInfo)
      .catch(() => navigate(`/missing-link?code=${code}`, { replace: true }))
      .finally(() => setLoading(false));
  }, [code, navigate]);

  // If the link is disabled or expired, redirect to missing-link with context
  useEffect(() => {
    if (!info) return;
    if (!info.isActive) {
      navigate(`/missing-link?code=${code}&reason=disabled`, { replace: true });
    } else if (info.isExpired) {
      navigate(`/missing-link?code=${code}&reason=expired`, { replace: true });
    } else {
      // Auto-redirect countdown
      setCountdown(5);
    }
  }, [info, code, navigate]);

  // Countdown tick
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0 && info?.originalUrl) {
      window.location.href = info.originalUrl;
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown, info]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!info) return null;

  const displayUrl =
    info.originalUrl.length > 60
      ? `${info.originalUrl.slice(0, 57)}…`
      : info.originalUrl;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Link2 size={20} className="text-blue-500 shrink-0" />
          <span className="text-sm font-medium text-gray-500">Link preview</span>
        </div>

        {/* Short URL */}
        <p className="text-xs text-gray-600 font-mono bg-gray-100 rounded px-2 py-1 inline-block mb-4">
          {code}
        </p>

        {/* Destination */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Destination</p>
          <p className="text-sm text-gray-800 font-medium break-all">{displayUrl}</p>
        </div>

        {/* Auto-redirect notice */}
        {countdown !== null && countdown > 0 && (
          <p className="text-xs text-center text-gray-400 mb-4">
            Redirecting automatically in {countdown}s…
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <a
            href={info.originalUrl}
            className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            rel="noopener noreferrer"
          >
            Continue to site
          </a>
          <Link
            to="/"
            className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
          >
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
