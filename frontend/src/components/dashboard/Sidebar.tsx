import { BarChart2, ChevronLeft, Home, Menu, X } from 'lucide-react';
import { Link, useMatch } from 'react-router';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const navItems: NavItem[] = [
    {
      icon: <Home size={20} />,
      label: 'Home',
      path: '/dashboard/home'
    },
    {
      icon: <BarChart2 size={20} />,
      label: 'Analytics',
      path: '/dashboard/analytics'
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-60
          md:relative md:inset-auto md:z-auto shrink-0
          ${collapsed ? 'md:w-16' : 'md:w-60'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          flex flex-col h-full bg-white border-r border-gray-200 shadow-sm
          transition-all duration-200 ease-in-out
        `}
      >
        {/* Logo / brand area */}
        <div
          className={`flex items-center h-16 border-b border-gray-200 px-4 gap-2 ${
            collapsed ? 'md:justify-center' : 'justify-between'
          }`}
        >
          <span
            className={`flex-1 text-base font-semibold text-gray-800 truncate ${
              collapsed ? 'md:hidden' : ''
            }`}
          >
            URL Shortener
          </span>

          {/* Mobile-only close button */}
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>

          {/* Desktop-only collapse toggle */}
          <button
            onClick={onToggle}
            className="hidden md:flex p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.path} item={item} collapsed={collapsed} onNavigate={onMobileClose} />
          ))}
        </nav>
      </aside>
    </>
  );
}

function NavLink({
  item,
  collapsed,
  onNavigate
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const active = !!useMatch(item.path);

  return (
    <Link
      to={item.path}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={`
        flex items-center gap-3 rounded-lg px-3 py-2.5
        text-sm font-medium transition-colors
        ${collapsed ? 'md:justify-center' : ''}
        ${active
      ? 'bg-blue-600 text-white shadow-sm'
      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}
      `}
    >
      <span className={`shrink-0 transition-colors ${active ? 'text-white' : 'text-gray-500'}`}>
        {item.icon}
      </span>
      {/* Always show label on mobile; on desktop hide when collapsed */}
      <span className={`truncate ${collapsed ? 'md:hidden' : ''}`}>{item.label}</span>
    </Link>
  );
}
