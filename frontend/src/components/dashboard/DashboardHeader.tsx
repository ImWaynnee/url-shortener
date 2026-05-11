import { useAuth } from '@hooks/useAuth';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';

export function DashboardHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }

  // Avatar initial — prefer first char of full name, fall back to email
  const initial = (user?.fullName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();

  // Header label — full name if available, otherwise the part before @
  const displayName = user?.fullName ?? user?.email?.split('@')[0] ?? '';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">Dashboard</span>
      </div>

      {/* Account menu */}
      <div ref={dropdownRef} className="relative" onBlur={handleBlur}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-colors"
          aria-haspopup="true"
          aria-expanded={open}
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold select-none">
            {initial}
          </div>
          <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[160px] truncate">
            {displayName}
          </span>
          <ChevronDownIcon />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
            {/* Identity block */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold select-none shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                {user?.fullName && (
                  <p className="text-sm font-semibold text-gray-800 truncate">{user.fullName}</p>
                )}
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={handleLogout}
              className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOutIcon />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
