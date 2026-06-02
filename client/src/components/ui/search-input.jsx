import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Search field with leading icon + clear button (React port of the UI SearchInput).
 * Controlled: value + onChange(string). Debouncing is left to the parent.
 */
export function SearchInput({ value = '', onChange, placeholder = 'Rechercher…', className }) {
  return (
    <div
      className={cn(
        'flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm shadow-xs transition-all',
        'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30',
        className
      )}
    >
      <Search className="size-4 shrink-0 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange?.('')}
          aria-label="Effacer"
          className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
