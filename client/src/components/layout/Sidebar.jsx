import { NavLink } from 'react-router-dom';
import { HeartHandshake, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { visibleNavItems } from './navItems';
import { roleLabel } from '@/lib/roles';
import { Avatar } from '@/components/ui/avatar';
import { NotificationBell } from '../NotificationBell';

// Desktop sidebar (visible ≥ md). Fixed, full-height.
export default function Sidebar() {
  const { user, logout } = useAuth();
  const items = visibleNavItems(user?.role);

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-card/80 backdrop-blur-sm md:flex">
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary-gradient text-primary-foreground shadow-primary">
          <HeartHandshake className="size-5" />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">Suivi des Âmes</p>
          <p className="truncate text-xs text-muted-foreground">Cathédrale SP</p>
        </div>
        <NotificationBell />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary-gradient text-primary-foreground shadow-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <Icon className="size-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <Avatar name={user?.fullName || user?.email} size="sm" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{user?.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{roleLabel(user?.role)}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Se déconnecter"
            className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive-dark"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
