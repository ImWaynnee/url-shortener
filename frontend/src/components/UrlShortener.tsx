import { apiClient } from '@api/client';
import { env } from '@config/env';
import axios from 'axios';
import { useState } from 'react';

interface ShortenResponse {
  shortUrl: string;
  originalUrl: string;
  newUrl: string;
}

function normalizeUrl(value: string): string {
  if (!/^https?:\/\//i.test(value)) {
    return `https://${value}`;
  }
  return value;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function UrlShortener() {
  const [inputUrl, setInputUrl] = useState('');
  const [result, setResult] = useState<ShortenResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShorten() {
    setError('');
    setResult(null);

    const normalized = normalizeUrl(inputUrl.trim());

    if (!isValidUrl(normalized)) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.post<ShortenResponse>(
        `${env.apiBaseUrl}/urls/shorten`,
        { url: normalized },
      );
      setResult(data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const messages: string | string[] | undefined = err.response?.data?.message;
        if (Array.isArray(messages) && messages.length > 0) {
          setError(messages[0]);
        } else if (typeof messages === 'string') {
          setError(messages);
        } else {
          setError('Something went wrong. Please try again.');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.newUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">URL Shortener</h1>
      <p className="text-gray-500 mb-6">
        Paste any URL and get a short one instantly.
      </p>

      <div className="flex gap-2">
        <input
          type="url"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleShorten()}
          placeholder="https://www.example.com/very/long/url"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleShorten}
          disabled={loading}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Shortening…' : 'Shorten'}
        </button>
      </div>

      <div className="mt-3 min-h-[1.25rem]">
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {result && (
        <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Your shortened URL</p>
          <div className="flex items-center gap-2">
            <a
              href={result.newUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-medium text-sm hover:underline truncate flex-1"
            >
              {result.newUrl.replace(/^https?:\/\//, '')}
            </a>
            <button
              onClick={handleCopy}
              className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md transition-colors shrink-0"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
