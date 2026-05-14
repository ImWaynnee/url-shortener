export function fmtIsoToDisplayDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function fmtIsoToDisplayDatetime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function filterTabCls(active: boolean): string {
  return `btn-filter ${
    active
      ? 'bg-blue-600 text-white border-blue-600'
      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
  }`;
}
