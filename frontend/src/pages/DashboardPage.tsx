import { AnalyticsDashPanel } from '@components/dashboard/analytics/AnalyticsDashPanel';
import { DashboardHeader } from '@components/dashboard/DashboardHeader';
import { HomeDashPanel } from '@components/dashboard/HomeDashPanel';
import { Sidebar } from '@components/dashboard/Sidebar';
import { useState } from 'react';
import { useLocation } from 'react-router';

export function DashboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isAnalytics = location.pathname.startsWith('/dashboard/analytics');

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <DashboardHeader onMobileMenuToggle={() => setMobileOpen((v) => !v)} />
        <main className="flex-1 overflow-hidden flex flex-col">
          {isAnalytics ? <AnalyticsDashPanel /> : <HomeDashPanel />}
        </main>
      </div>
    </div>
  );
}
