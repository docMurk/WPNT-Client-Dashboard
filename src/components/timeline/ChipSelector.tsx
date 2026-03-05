import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';

interface ChipSelectorItem {
  id: string;
  label: string;
  subLabel?: string;
}

interface ChipSelectorProps {
  label: string;
  items: ChipSelectorItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  openDirection?: 'down' | 'left';
}

export function ChipSelector({
  label,
  items,
  selectedIds,
  onToggle,
  onClear,
  openDirection = 'down',
}: ChipSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const filteredItems = items.filter(
    (item) =>
      !search ||
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.subLabel?.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all ${
          selectedIds.length > 0
            ? 'border-wpnt-blue bg-wpnt-blue/5 text-wpnt-blue shadow-sm'
            : 'border-wpnt-border bg-white text-wpnt-text shadow-sm hover:shadow hover:border-wpnt-blue/30'
        }`}
      >
        {label}
        {selectedIds.length > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-wpnt-blue text-[9px] font-bold text-white">
            {selectedIds.length}
          </span>
        )}
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute z-50 w-64 rounded-lg border border-wpnt-border bg-white shadow-lg ${
          openDirection === 'left' ? 'right-0 top-full mt-1' : 'top-full mt-1'
        }`}>
          {/* Search */}
          <div className="relative border-b border-wpnt-border p-2">
            <Search size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-wpnt-text" />
            <input
              type="text"
              placeholder={`Search ${label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-wpnt-border py-1 pl-7 pr-2 text-xs outline-none focus:border-wpnt-blue"
              autoFocus
            />
          </div>

          {/* List */}
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-2 text-xs text-wpnt-text">No matches</div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => onToggle(item.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-left transition-colors hover:bg-wpnt-surface"
                  >
                    <span
                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[8px] ${
                        isSelected
                          ? 'border-wpnt-blue bg-wpnt-blue text-white'
                          : 'border-wpnt-border'
                      }`}
                    >
                      {isSelected && '✓'}
                    </span>
                    <span className="font-medium text-wpnt-body truncate">{item.label}</span>
                    {item.subLabel && (
                      <span className="ml-auto text-wpnt-text shrink-0">{item.subLabel}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {selectedIds.length > 0 && (
            <div className="border-t border-wpnt-border p-2">
              <button
                onClick={() => {
                  onClear();
                  setIsOpen(false);
                  setSearch('');
                }}
                className="text-[10px] text-wpnt-text hover:text-wpnt-body"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chips */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selectedItems.map((item) => (
            <span
              key={item.id}
              className="flex items-center gap-1 rounded-full bg-wpnt-blue/10 px-2 py-0.5 text-[10px] font-medium text-wpnt-blue"
            >
              {item.subLabel || item.label}
              <button
                onClick={() => onToggle(item.id)}
                className="rounded-full hover:bg-wpnt-blue/20"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
