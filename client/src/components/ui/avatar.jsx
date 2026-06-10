import { avatarColor, initials } from '@/lib/avatar';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
};

// Initials avatar with a deterministic color derived from the name.
export function Avatar({ name, size = 'md', className }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-white',
        SIZES[size] || SIZES.md,
        avatarColor(name),
        className
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
