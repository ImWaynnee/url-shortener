import { ChevronLeft, Home, Menu } from 'lucide-react';
import { Link, useMatch } from 'react-router';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const navItems: NavItem[] = [
    {
      icon: <Home size={20} />,
      label: 'Home',
      path: '/dashboard/home',
    },
  ];

  return (
    <aside
      className={`
        flex flex-col h-full bg-white border-r border-gray-200 shadow-sm
        transition-all duration-200 ease-in-out shrink-0
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo / brand area */}
      <div className={`flex items-center h-16 border-b border-gray-100 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <span className="text-base font-semibold text-gray-800 truncate">URL Shortener</span>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.path} item={item} collapsed={collapsed} />
        ))}
      </nav>
    </aside>
  );
}

function NavLink({ item, collapsed }: { item: NavItem;
  collapsed: boolean }) {
  const active = !!useMatch(item.path);

  return (
    <Link
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={`
        flex items-center gap-3 rounded-lg px-3 py-2.5
        text-sm font-medium transition-colors
        ${collapsed ? 'justify-center' : ''}
        ${active
      ? 'bg-blue-600 text-white shadow-sm'
      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}
      `}
    >
      <span className={`shrink-0 transition-colors ${active ? 'text-white' : 'text-gray-500'}`}>
        {item.icon}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

