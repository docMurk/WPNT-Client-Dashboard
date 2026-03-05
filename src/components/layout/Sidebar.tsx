import { NavLink } from 'react-router';
import { CalendarRange, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOutreachStore } from '@/store/outreachStore';
import wpntLogo from '@/assets/wpnt-logo.png';

const navItems = [
  { to: '/', label: 'Timeline', icon: CalendarRange },
  { to: '/history', label: 'History', icon: History },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useOutreachStore();

  return (
    <aside
      className={`flex flex-col border-r border-wpnt-border bg-wpnt-surface transition-all duration-200 ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo area */}
      <div className="flex h-16 items-center border-b border-wpnt-border px-4">
        <img
          src={wpntLogo}
          alt="WPNT Communications"
          className={`object-contain transition-all duration-200 ${
            sidebarCollapsed ? 'h-8 w-10' : 'h-10 w-full'
          }`}
        />
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-active text-wpnt-blue'
                  : 'text-wpnt-text hover:bg-wpnt-surface'
              } ${sidebarCollapsed ? 'justify-center' : ''}`
            }
            title={sidebarCollapsed ? label : undefined}
          >
            <Icon size={18} />
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center border-t border-wpnt-border p-3 text-wpnt-text hover:bg-wpnt-surface transition-colors"
      >
        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
