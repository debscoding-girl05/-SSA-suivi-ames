import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { visibleNavItems } from './navItems';

// Mobile bottom tab bar (visible < md). Fixed at the bottom, 44px+ tap targets.
export default function BottomNav() {
  const { user } = useAuth();
  const items = visibleNavItems(user?.role);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
