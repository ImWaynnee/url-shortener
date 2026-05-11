import { DashboardHeader } from '@components/dashboard/DashboardHeader';
import { HomeDashPanel } from '@components/dashboard/HomeDashPanel';
import { Sidebar } from '@components/dashboard/Sidebar';
import { useState } from 'react';

export function DashboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <HomeDashPanel />
        </main>
      </div>
    </div>
  );
}
