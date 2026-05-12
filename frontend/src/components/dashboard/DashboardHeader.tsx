import { useAuth } from '@hooks/useAuth';
import { ChevronDown, LogOut } from 'lucide-react';
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
          <ChevronDown size={16} className="text-gray-400" />
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
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

