import { useHealthCheck } from '@hooks/useHealthCheck';

export function BackendStatusCard() {
  const { isOnline } = useHealthCheck();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ring-red-200">
      <span className="relative flex h-3 w-3 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-800">Sorry, we can't reach the servers!</p>
        <p className="text-xs text-gray-500">We may be deploying some updates, please refresh and try again later.</p>
      </div>
    </div>
  );
}
