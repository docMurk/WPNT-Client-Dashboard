import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { RightSidebar } from './RightSidebar';

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="relative flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto bg-wpnt-page">
          <Outlet />
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}
