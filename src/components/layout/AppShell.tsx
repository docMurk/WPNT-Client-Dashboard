import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { RightSidebar } from './RightSidebar';
import { APP_VERSION } from '@/version';

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="relative flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto bg-white">
          <Outlet />
        </main>
        <span className="fixed bottom-2 z-10 text-[10px] text-wpnt-text/40 select-none pointer-events-none" style={{ left: 72 }}>
          v{APP_VERSION}
        </span>
        <RightSidebar />
      </div>
    </div>
  );
}
