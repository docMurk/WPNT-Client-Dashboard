import { NavLink } from 'react-router';
import { CalendarRange, History } from 'lucide-react';
import wpntLogo from '@/assets/wpnt-logo.png';
import { APP_VERSION } from '@/version';

const navItems = [
  { to: '/', label: 'Timeline', icon: CalendarRange },
  { to: '/history', label: 'History', icon: History },
];

export function Sidebar() {
  return (
    <aside className="flex flex-col border-r border-wpnt-border bg-wpnt-surface w-16">
      {/* Logo area */}
      <div className="flex flex-col h-20 items-center justify-center border-b border-wpnt-border px-4">
        <img
          src={wpntLogo}
          alt="WPNT Communications"
          className="h-8 w-10 object-contain"
        />
        <span style={{ color: 'red', fontSize: 10, fontWeight: 'bold' }}>v{APP_VERSION}</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-active text-wpnt-blue'
                  : 'text-wpnt-text hover:bg-wpnt-surface'
              }`
            }
            title={label}
          >
            <Icon size={18} />
          </NavLink>
        ))}
      </nav>

      <div className="pb-2 text-center">
        <span style={{ color: 'red', fontSize: 14, fontWeight: 'bold' }}>
          v{APP_VERSION}
        </span>
      </div>
    </aside>
  );
}
