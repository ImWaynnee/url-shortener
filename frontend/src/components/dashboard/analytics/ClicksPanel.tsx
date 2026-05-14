import { listClicksApi, type PaginatedResponse, type UrlClickResponse } from '@api/url';
import { fmtIsoToDisplayDatetime } from '@components/dashboard/analytics/utils';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ClicksPanel({
  urlId,
  destinationId
}: {
  urlId: string;
  destinationId: string;
}) {
  const [data, setData] = useState<PaginatedResponse<UrlClickResponse> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setLoading(true);
    listClicksApi(urlId, destinationId, {
      page,
      pageSize 
    })
      .then(setData)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [urlId, destinationId, page]);

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="bg-gray-50 border-t border-gray-200">
      {loading && !data && (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={14} className="animate-spin text-gray-600" aria-label="Loading clicks" />
        </div>
      )}

      {!loading && data?.items.length === 0 && (
        <p className="text-xs text-gray-600 py-3 px-8 italic">No click history yet.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="divide-y divide-gray-100">
          {data.items.map((click, i) => (
            <div
              key={click.id}
              className={`px-8 py-3 text-xs ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
            >
              <div className="flex items-start gap-6 flex-wrap">
                <div className="shrink-0 min-w-[80px]">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">IP</p>
                  <p className="font-mono text-gray-700 mt-0.5">{click.ipAddress ?? '—'}</p>
                </div>
                <div className="flex-1 min-w-[140px] max-w-[300px]">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">User Agent</p>
                  <p className="text-gray-600 truncate mt-0.5" title={click.userAgent ?? undefined}>
                    {click.userAgent ?? '—'}
                  </p>
                </div>
                <div className="min-w-[100px] max-w-[180px]">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">Referrer</p>
                  <p className="text-gray-600 truncate mt-0.5" title={click.referrer ?? undefined}>
                    {click.referrer ?? '—'}
                  </p>
                </div>
                <div className="shrink-0 ml-auto text-right">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">Time</p>
                  <p className="text-gray-500 whitespace-nowrap mt-0.5">
                    {fmtIsoToDisplayDatetime(click.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && (
        <div className="flex items-center justify-between px-8 py-2 border-t border-gray-200 text-xs text-gray-500">
          <span>
            {data.total} click{data.total !== 1 ? 's' : ''} total
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page of clicks"
                className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </button>
              <span className="px-2">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page of clicks"
                className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
