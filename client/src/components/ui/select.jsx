import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Elegant single-select dropdown (React port of the project's UI Select).
 * Props:
 *  - options: { value, label }[]
 *  - value: selected value (or '' for none)
 *  - onChange: (value) => void
 *  - placeholder, searchable, className, size ('default' | 'sm')
 */
export function Select({
  options = [],
  value = '',
  onChange,
  placeholder = 'Sélectionner…',
  searchable = false,
  className,
  size = 'default',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  function close() {
    setOpen(false);
    setQuery('');
  }

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Focus the search box when the panel opens (DOM side-effect only).
  useEffect(() => {
    if (open && searchable) {
      const t = setTimeout(() => searchRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, searchable]);

  function pick(option) {
    onChange?.(option.value);
    close();
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none transition-colors',
          'hover:border-ring/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30',
          size === 'sm' ? 'h-8' : 'h-10',
          open && 'border-ring ring-3 ring-ring/30'
        )}
      >
        <span className={cn('truncate', selected ? 'text-foreground' : 'text-muted-foreground')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180 text-primary'
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg animate-slide-up-fade">
          {searchable && (
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full rounded-lg border border-input bg-background py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-inset focus:ring-ring/30"
                />
              </div>
            </div>
          )}
          <ul role="listbox" className="custom-scrollbar max-h-60 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <li className="px-2 py-3 text-center text-xs italic text-muted-foreground">
                Aucun résultat
              </li>
            ) : (
              filtered.map((option) => {
                const isSelected = String(option.value) === String(value);
                return (
                  <li
                    key={String(option.value)}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onClick={() => pick(option)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        pick(option);
                      }
                    }}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors',
                      'hover:bg-primary-transparent focus:bg-primary-transparent',
                      isSelected && 'text-primary font-medium'
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check className="size-4 shrink-0 text-primary" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
