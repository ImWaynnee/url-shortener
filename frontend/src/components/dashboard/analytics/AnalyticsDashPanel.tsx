import { listUrlsApi, type PaginatedResponse, type UrlResponse } from '@api/url';
import { Toast, type ToastMsg } from '@components/dashboard/analytics/Toast';
import { UrlCard } from '@components/dashboard/analytics/UrlCard';
import { filterTabCls } from '@components/dashboard/analytics/utils';
import { ChevronLeft, ChevronRight, Filter, Loader2, MousePointerClick, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type StatusFilter = boolean | undefined;
type ExpiryFilter = boolean | undefined;

interface Filters {
  search: string;
  isActive: StatusFilter;
  isExpired: ExpiryFilter;
}

export function AnalyticsDashPanel() {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    isActive: undefined,
    isExpired: undefined
  });
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [data, setData] = useState<PaginatedResponse<UrlResponse> | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const [notification, setNotification] = useState<ToastMsg | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(text: string, sub?: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setNotification({
      text,
      sub 
    });
    toastTimer.current = setTimeout(() => setNotification(null), 3500);
  }

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const fetchUrls = useCallback(() => {
    setLoading(true);
    setFetchError(false);
    listUrlsApi({
      ...filters,
      page,
      pageSize 
    })
      .then(setData)
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [filters, page]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  function handleUrlUpdated(_updated: UrlResponse) {
    fetchUrls();
  }

  function applySearch() {
    setPage(1);
    setFilters((f) => ({
      ...f,
      search: searchInput 
    }));
  }

  function setStatusFilter(val: StatusFilter) {
    setPage(1);
    setFilters((f) => ({
      ...f,
      isActive: val 
    }));
  }

  function setExpiryFilter(val: ExpiryFilter) {
    setPage(1);
    setFilters((f) => ({
      ...f,
      isExpired: val 
    }));
  }

  function clearFilters() {
    setSearchInput('');
    setPage(1);
    setFilters({
      search: '',
      isActive: undefined,
      isExpired: undefined 
    });
  }

  const hasActiveFilters =
    filters.search !== '' || filters.isActive !== undefined || filters.isExpired !== undefined;
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="flex flex-col flex-1 p-6 gap-4 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Analytics</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            {data
              ? `${data.total} URL${data.total !== 1 ? 's' : ''} total`
              : 'Track clicks and manage your short URLs'}
          </p>
        </div>
        <button
          onClick={fetchUrls}
          disabled={loading}
          aria-label="Refresh URL list"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={13} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div
        className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm shrink-0"
        role="search"
        aria-label="Filter URLs"
      >
        <Filter size={14} className="text-gray-600 shrink-0" aria-hidden="true" />

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search
              size={13}
              aria-hidden="true"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600"
            />
            <input
              type="search"
              placeholder="Search by code, URL or comment…"
              value={searchInput}
              maxLength={200}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              aria-label="Search URLs"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={applySearch}
            aria-label="Apply search"
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Search
          </button>
        </div>

        <div className="flex items-center gap-1" role="group" aria-label="Filter by status">
          <span className="text-xs text-gray-600 mr-1" aria-hidden="true">Status:</span>
          {([undefined, true, false] as const).map((val) => (
            <button
              key={String(val)}
              onClick={() => setStatusFilter(val)}
              aria-pressed={filters.isActive === val}
              className={filterTabCls(filters.isActive === val)}
            >
              {val === undefined ? 'All' : val ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1" role="group" aria-label="Filter by expiry">
          <span className="text-xs text-gray-600 mr-1" aria-hidden="true">Expiry:</span>
          {([undefined, false, true] as const).map((val) => (
            <button
              key={String(val)}
              onClick={() => setExpiryFilter(val)}
              aria-pressed={filters.isExpired === val}
              className={filterTabCls(filters.isExpired === val)}
            >
              {val === undefined ? 'All' : val ? 'Expired' : 'Valid'}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            aria-label="Clear all filters"
            className="text-xs text-blue-500 hover:text-blue-700 underline whitespace-nowrap"
          >
            Clear
          </button>
        )}
      </div>

      {/* URL card list */}
      <div
        className="flex-1 overflow-y-auto min-h-0 pr-0.5 space-y-2"
        aria-label="URL list"
        aria-busy={loading}
      >
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-600 gap-3">
            <Loader2 size={28} className="animate-spin text-blue-300" aria-label="Loading URLs" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {fetchError && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-red-400">
            <p className="text-sm">Failed to load URLs.</p>
            <button onClick={fetchUrls} className="text-xs text-blue-500 hover:underline">
              Retry
            </button>
          </div>
        )}

        {!loading && !fetchError && data?.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600 gap-2">
            <MousePointerClick size={32} className="opacity-30" aria-hidden="true" />
            <p className="text-sm">No URLs found.</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-blue-500 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        )}

        {data?.items.map((url, i) => (
          <UrlCard
            key={url.id}
            url={url}
            index={i}
            onUpdated={handleUrlUpdated}
            showToast={showToast}
          />
        ))}
      </div>

      {/* Pagination */}
      {data && (
        <div
          className="flex items-center justify-between text-sm text-gray-500 shrink-0"
          aria-label="URL list pagination"
        >
          <span>
            {data.total === 0
              ? '0 URLs'
              : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, data.total)} of ${data.total}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <span className="text-xs text-gray-600 whitespace-nowrap">
              Page {page} of {Math.max(totalPages, 1)}
            </span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
          <Toast text={notification.text} sub={notification.sub} />
        </div>
      )}
    </div>
  );
}
