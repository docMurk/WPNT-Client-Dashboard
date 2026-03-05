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
        <RightSidebar />
        <span className="absolute bottom-2 left-2 text-[10px] text-wpnt-text/40 select-none pointer-events-none">
          v{APP_VERSION}
        </span>
      </div>
    </div>
  );
}
