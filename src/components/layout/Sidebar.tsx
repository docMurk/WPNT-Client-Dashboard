import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router';
import { CalendarRange, History, Palette } from 'lucide-react';
import wpntLogo from '@/assets/wpnt-logo.png';
import { APP_VERSION } from '@/version';
import { useThemeStore, type ThemeId } from '@/store/themeStore';

const navItems = [
  { to: '/', label: 'Timeline', icon: CalendarRange },
  { to: '/history', label: 'History', icon: History },
];

const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'default', label: 'Corporate', swatch: '#1A365D' },
  { id: 'dark', label: 'Dark', swatch: '#0F172A' },
  { id: 'minimal', label: 'Minimal', swatch: '#2563EB' },
  { id: 'original', label: 'Original', swatch: '#1F4E78' },
];

export function Sidebar() {
  const { theme, setTheme } = useThemeStore();
  const [showThemes, setShowThemes] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showThemes) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowThemes(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showThemes]);

  return (
    <aside className="flex flex-col border-r border-wpnt-border bg-wpnt-surface w-16">
      {/* Logo area */}
      <div className="flex h-16 items-center justify-center border-b border-wpnt-border px-4">
        <img
          src={wpntLogo}
          alt="WPNT Communications"
          className="h-8 w-10 object-contain"
        />
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center justify-center border-l-2 px-2 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-wpnt-blue text-wpnt-blue'
                  : 'border-transparent text-wpnt-text hover:bg-wpnt-surface'
              }`
            }
            title={label}
          >
            <Icon size={36} />
          </NavLink>
        ))}
      </nav>

      {/* Theme picker */}
      <div className="relative px-2 pb-1" ref={pickerRef}>
        <button
          onClick={() => setShowThemes(!showThemes)}
          className="flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-wpnt-text hover:bg-sidebar-active transition-colors"
          title="Theme"
        >
          <Palette size={18} />
        </button>

        {showThemes && (
          <div className="absolute bottom-full left-full ml-1 mb-0 w-36 rounded-lg border border-wpnt-border bg-wpnt-card shadow-lg p-2 space-y-1 z-50">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setShowThemes(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  theme === t.id
                    ? 'bg-wpnt-surface text-wpnt-blue'
                    : 'text-wpnt-body hover:bg-wpnt-surface'
                }`}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-wpnt-border shrink-0"
                  style={{ backgroundColor: t.swatch }}
                />
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pb-3 text-center">
        <span className="text-[9px] text-wpnt-text/50">
          v{APP_VERSION}
        </span>
      </div>
    </aside>
  );
}
