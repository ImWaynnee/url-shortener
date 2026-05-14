import { updateUrlApi, type UrlResponse } from '@api/url';
import { DateTimePicker } from '@components/common/react-aria/DateTimePicker';
import { DestinationsPanel } from '@components/dashboard/analytics/DestinationsPanel';
import { fmtIsoToDisplayDate, fmtIsoToDisplayDatetime } from '@components/dashboard/analytics/utils';
import { env } from '@config/env';
import { type CalendarDateTime, parseAbsoluteToLocal, parseDateTime, toCalendarDateTime, toZoned } from '@internationalized/date';
import { Calendar, CalendarX, Check, ChevronRight, Copy, Loader2, MessageSquare, MoreVertical, MousePointerClick, Power, Replace, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface UrlCardProps {
  url: UrlResponse;
  index: number;
  onUpdated: (url: UrlResponse) => void;
  showToast: (text: string, sub?: string) => void;
}

export function UrlCard({ url, index, onUpdated, showToast }: UrlCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [editMode, setEditMode] = useState<'comments' | 'expiry' | 'destination' | null>(null);
  const [commentsDraft, setCommentsDraft] = useState(url.comments ?? '');
  const [expiryDraft, setExpiryDraft] = useState<CalendarDateTime | null>(
    url.expiresAt ? parseDateTime(url.expiresAt.slice(0, 19)) : null
  );
  const [destinationDraft, setDestinationDraft] = useState(url.destinationUrl);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [destinationRefreshKey, setDestinationRefreshKey] = useState(0);

  const isExpired = url.expiresAt != null && new Date(url.expiresAt) < new Date();
  const fullUrl = `${env.VITE_REDIRECT_DOMAIN}/${url.shortUrl}`;

  const cardBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

  // Sync drafts when parent propagates an update
  useEffect(() => {
    setCommentsDraft(url.comments ?? '');
    setExpiryDraft(url.expiresAt ? toCalendarDateTime(parseAbsoluteToLocal(url.expiresAt)) : null);
    setDestinationDraft(url.destinationUrl);
  }, [url.comments, url.expiresAt, url.destinationUrl]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (!mobileMenuRef.current?.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [mobileMenuOpen]);

  function handleCopy() {
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Copied!', 'Tip: add "+" to the end for a preview page before redirecting');
    });
  }

  function isValidUrl(value: string): boolean {
    try { new URL(value); return true; } catch { return false; }
  }

  async function saveComments() {
    // Collapse multiple spaces/newlines to a single space, trim leading/trailing
    const normalized = commentsDraft.replace(/\s+/g, ' ').trim();
    if ((url.comments ?? '').replace(/\s+/g, ' ').trim() === normalized) {
      setEditMode(null);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateUrlApi(url.id, { comments: normalized || null });
      onUpdated(updated);
      setEditMode(null);
      showToast('Comment saved');
    } catch {
      showToast('Failed to save comment');
    } finally {
      setSaving(false);
    }
  }

  async function saveDestination() {
    if (!isValidUrl(destinationDraft)) return;
    if (destinationDraft.trim() === (url.destinationUrl ?? '').trim()) {
      setEditMode(null);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateUrlApi(url.id, { destinationUrl: destinationDraft });
      onUpdated(updated);
      setEditMode(null);
      showToast('Destination updated');
      setDestinationRefreshKey((k) => k + 1); // refresh destinations panel
    } catch {
      showToast('Failed to update destination');
    } finally {
      setSaving(false);
    }
  }

  async function clearExpiry() {
    setSaving(true);
    try {
      const updated = await updateUrlApi(url.id, { expiresAt: null });
      onUpdated(updated);
      showToast('Expiry cleared');
    } catch {
      showToast('Failed to clear expiry');
    } finally {
      setSaving(false);
    }
  }

  async function saveExpiry() {
    const timeZone = window.Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isoExpiry = expiryDraft ? toZoned(expiryDraft, timeZone).toAbsoluteString() : null;
    const currentIsoExpiry = url.expiresAt ? toZoned(toCalendarDateTime(parseAbsoluteToLocal(url.expiresAt)), timeZone).toAbsoluteString() : null;
    if (isoExpiry === currentIsoExpiry) {
      setEditMode(null);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateUrlApi(url.id, { expiresAt: isoExpiry });
      onUpdated(updated);
      setEditMode(null);
      showToast(isoExpiry ? 'Expiry updated' : 'Expiry cleared');
    } catch {
      showToast('Failed to update expiry');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    setSaving(true);
    try {
      const updated = await updateUrlApi(url.id, { isActive: !url.isActive });
      onUpdated(updated);
      showToast(url.isActive ? 'URL disabled' : 'URL enabled');
    } catch {
      showToast('Failed to update status');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`rounded-xl border border-gray-200 shadow-sm relative ${cardBg}`}>
      {/* Card header */}
      <div className="flex items-start gap-3 p-4">
        {/* Expand toggle — desktop only */}
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} details for ${url.shortUrl}`}
          className="mt-0.5 p-1 rounded text-gray-600 hover:bg-gray-100 transition-colors shrink-0 hidden md:flex"
        >
          <ChevronRight
            size={15}
            aria-hidden="true"
            className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </button>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Top row: short code pill + copy + clicks */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="pill" aria-label={`Short code: ${url.shortUrl}`}>
              {url.shortUrl}
            </span>

            <button
              onClick={handleCopy}
              aria-label="Copy short URL to clipboard"
              title={`Copy ${fullUrl}`}
              className="btn-ghost p-1 hover:text-blue-600 hover:bg-blue-50"
            >
              {copied ? (
                <Check size={13} className="text-green-500" aria-hidden="true" />
              ) : (
                <Copy size={13} aria-hidden="true" />
              )}
            </button>

            <span
              className="inline-flex items-center gap-1 text-xs text-gray-500"
              aria-label={`${url.totalClicks} total clicks`}
            >
              <MousePointerClick size={11} aria-hidden="true" />
              {url.totalClicks.toLocaleString()}
              <span className="hidden sm:inline">clicks</span>
            </span>
          </div>

          {/* Destination URL — view or inline edit */}
          {editMode === 'destination' ? (
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="url"
                value={destinationDraft}
                onChange={(e) => setDestinationDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveDestination();
                  if (e.key === 'Escape') { setEditMode(null); setDestinationDraft(url.destinationUrl); }
                }}
                placeholder="https://…"
                aria-label="New destination URL"
                autoFocus
                className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={() => void saveDestination()}
                disabled={saving || !isValidUrl(destinationDraft)}
                aria-label="Save destination URL"
                className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Check size={12} aria-hidden="true" />
                )}
              </button>
              <button
                onClick={() => { setEditMode(null); setDestinationDraft(url.destinationUrl); }}
                aria-label="Cancel editing destination"
                className="p-1.5 rounded text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-700 truncate mt-1.5" title={url.destinationUrl}>
              {url.destinationUrl}
            </p>
          )}

          {/* Comment — view or inline edit */}
          {editMode === 'comments' ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={commentsDraft}
                onChange={(e) => setCommentsDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveComments();
                  if (e.key === 'Escape') setEditMode(null);
                }}
                placeholder="Add a comment…"
                aria-label="Edit comment"
                autoFocus
                className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={() => void saveComments()}
                disabled={saving}
                aria-label="Save comment"
                className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Check size={12} aria-hidden="true" />
                )}
              </button>
              <button
                onClick={() => setEditMode(null)}
                aria-label="Cancel editing comment"
                className="p-1.5 rounded text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </div>
          ) : (
            url.comments && (
              <p className="text-xs text-gray-600 italic mt-1 truncate" title={url.comments}>
                {url.comments}
              </p>
            )
          )}

          {/* Expiry — view or inline edit */}
          {editMode === 'expiry' ? (
            <div className="mt-2 flex items-center gap-2">
              <DateTimePicker
                value={expiryDraft}
                onChange={setExpiryDraft}
                hourCycle={12}
                granularity="minute"
              />
              <button
                onClick={() => void saveExpiry()}
                disabled={saving}
                aria-label="Save expiry date"
                className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Check size={12} aria-hidden="true" />
                )}
              </button>
              <button
                onClick={() => {
                  setEditMode(null);
                  setExpiryDraft(
                    url.expiresAt ? toCalendarDateTime(parseAbsoluteToLocal(url.expiresAt)) : null
                  );
                }}
                aria-label="Cancel editing expiry"
                className="p-1.5 rounded text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-xs text-gray-400">Created {fmtIsoToDisplayDate(url.createdAt)}</span>
              <span className="text-xs text-gray-400">|</span>
              <span className={`text-xs ${isExpired ? 'text-red-400' : 'text-gray-400'}`}>
                {url.expiresAt ? `Expires ${fmtIsoToDisplayDatetime(url.expiresAt)}` : 'No expiry'}
              </span>
              <button
                onClick={() => {
                  setEditMode('expiry');
                  if (!url.expiresAt) {
                    // Default to now if no expiry is set
                    setExpiryDraft(toCalendarDateTime(parseAbsoluteToLocal(new Date().toISOString())));
                  }
                }}
                aria-label="Set expiry date"
                title="Set expiry"
                className="btn-ghost flex items-center gap-1 px-1.5 py-0.5 hover:text-blue-600 hover:bg-blue-50"
              >
                <Calendar size={11} aria-hidden="true" />
                <span className="hidden lg:inline text-xs">Set Expiry</span>
              </button>
              {url.expiresAt && (
                <button
                  onClick={() => void clearExpiry()}
                  disabled={saving}
                  aria-label="Clear expiry date"
                  title="Clear expiry"
                  className="btn-ghost flex items-center gap-1 px-1.5 py-0.5 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <CalendarX size={11} aria-hidden="true" />
                  <span className="hidden lg:inline text-xs">Clear Expiry</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action buttons — desktop */}
        <div
          className="hidden md:flex items-center gap-1 shrink-0"
          role="group"
          aria-label={`Actions for /${url.shortUrl}`}
        >
          <button
            onClick={() => setEditMode(editMode === 'destination' ? null : 'destination')}
            aria-label="Change destination URL"
            aria-pressed={editMode === 'destination'}
            title="Change destination"
            className={`btn-labeled ${
              editMode === 'destination'
                ? 'text-blue-600 bg-blue-50 border-blue-200'
                : 'text-gray-600 bg-white border-gray-200 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200'
            }`}
          >
            <Replace size={14} aria-hidden="true" />
            <span className="hidden lg:inline text-xs">Change URL</span>
          </button>

          <button
            onClick={() => setEditMode(editMode === 'comments' ? null : 'comments')}
            aria-label="Edit comment"
            aria-pressed={editMode === 'comments'}
            title="Edit comment"
            className={`btn-labeled ${
              editMode === 'comments'
                ? 'text-blue-600 bg-blue-50 border-blue-200'
                : 'text-gray-600 bg-white border-gray-200 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <MessageSquare size={14} aria-hidden="true" />
            <span className="hidden lg:inline text-xs">Comment</span>
          </button>

          <button
            onClick={() => void toggleActive()}
            disabled={saving}
            aria-label={url.isActive && !isExpired ? 'Disable URL' : 'Enable URL'}
            title={url.isActive && !isExpired ? 'Disable' : 'Enable'}
            className={`btn-labeled disabled:opacity-50 ${
              url.isActive && !isExpired
                ? 'text-green-600 bg-green-50 border-green-200 hover:text-red-600 hover:bg-red-50 hover:border-red-200'
                : !url.isActive
                  ? `text-red-400 bg-red-50/60 border-red-200 ${isExpired ? 'hover:text-yellow-600 hover:bg-yellow-50 hover:border-yellow-200' : 'hover:text-green-600 hover:bg-green-50 hover:border-green-200'}`
                  : 'text-yellow-600 bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
            }`}
          >
            <Power size={14} aria-hidden="true" />
            <span className="hidden lg:inline text-xs font-medium">
              {!url.isActive ? 'Disabled' : isExpired ? 'Expired' : 'Active'}
            </span>
          </button>
        </div>

        {/* Three-dot menu — mobile */}
        <div className="md:hidden relative shrink-0" ref={mobileMenuRef}>
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="More actions"
            aria-expanded={mobileMenuOpen}
            className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <MoreVertical size={16} aria-hidden="true" />
          </button>
          {mobileMenuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1">
              <button
                onClick={() => { setEditMode(editMode === 'destination' ? null : 'destination'); setMobileMenuOpen(false); }}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Replace size={14} aria-hidden="true" className="text-gray-500 shrink-0" />
                Change URL
              </button>
              <button
                onClick={() => { setEditMode(editMode === 'comments' ? null : 'comments'); setMobileMenuOpen(false); }}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <MessageSquare size={14} aria-hidden="true" className="text-gray-500 shrink-0" />
                Comment
              </button>
              <button
                onClick={() => { void toggleActive(); setMobileMenuOpen(false); }}
                disabled={saving}
                className={`w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 ${url.isActive ? 'text-red-600' : 'text-green-600'}`}
              >
                <Power size={14} aria-hidden="true" className="shrink-0" />
                {url.isActive ? 'Disable URL' : 'Enable URL'}
              </button>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={() => { setExpanded((v) => !v); setMobileMenuOpen(false); }}
                  className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight
                    size={14}
                    aria-hidden="true"
                    className={`text-gray-500 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
                  />
                  {expanded ? 'Hide Past Redirects' : 'Show Past Redirects'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expanded: past destinations */}
      {expanded && (
        <div className="border-t border-gray-100 bg-blue-50/20 rounded-b-xl overflow-x-auto">
          <DestinationsPanel urlId={url.id} refreshKey={destinationRefreshKey} />
        </div>
      )}
    </div>
  );
}
