import { listDestinationsApi, type UrlDestinationResponse } from '@api/url';
import { fmtIsoToDisplayDatetime } from '@components/dashboard/analytics/utils';
import { Loader2, MousePointerClick } from 'lucide-react';
import { useEffect, useState } from 'react';

export function DestinationsPanel({ urlId }: { urlId: string }) {
  const [destinations, setDestinations] = useState<UrlDestinationResponse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listDestinationsApi(urlId)
      .then(setDestinations)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [urlId]);

  // Active destination is already shown on the card — skip it here
  const pastDestinations = destinations?.slice(1) ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2
          size={14}
          className="animate-spin text-blue-300"
          aria-label="Loading past destinations"
        />
      </div>
    );
  }

  if (pastDestinations.length === 0) {
    return (
      <p className="text-xs text-gray-600 px-6 py-3 italic">No destination changes!</p>
    );
  }

  return (
    <div className="min-w-max divide-y divide-blue-10/80">
      <p className="px-6 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
        Past Redirects ({pastDestinations.length})
      </p>

      {pastDestinations.map((dest) => {
        const isExpanded = expandedId === dest.id;
        return (
          <div key={dest.id}>
            <button
              disabled={true} // Disabled, not ready.
              className="w-full flex items-center gap-3 px-6 py-2.5 hover:bg-blue-50/60 transition-colors text-left"
              onClick={() => setExpandedId(isExpanded ? null : dest.id)}
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} click history for ${dest.destinationUrl}`}
            >
              <span className="text-xs font-mono text-gray-600 whitespace-nowrap">
                {dest.destinationUrl ?? '—'}
              </span>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className="inline-flex items-center gap-1 text-xs text-gray-500"
                  aria-label={`${dest.clickCount} clicks`}
                >
                  <MousePointerClick size={11} aria-hidden="true" />
                  {dest.clickCount.toLocaleString()}
                </span>
                <span className="text-xs text-gray-600 w-36 text-right">
                  {fmtIsoToDisplayDatetime(dest.createdAt)}
                </span>
              </div>
            </button>

            {/*{isExpanded && <ClicksPanel urlId={urlId} destinationId={dest.id} />}*/}
          </div>
        );
      })}
    </div>
  );
}
