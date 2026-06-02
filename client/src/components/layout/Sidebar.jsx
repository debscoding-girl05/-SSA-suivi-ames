import { NavLink } from 'react-router-dom';
import { HeartHandshake, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { visibleNavItems } from './navItems';

const ROLE_LABELS = { admin: 'Administrateur', leader: 'Responsable', volunteer: 'Encadreur' };

// Desktop sidebar (visible ≥ md). Fixed, full-height, flat.
export default function Sidebar() {
  const { user, logout } = useAuth();
  const items = visibleNavItems(user?.role);
  const initials = (user?.fullName || user?.email || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-card md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HeartHandshake className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-medium">Suivi des Âmes</p>
          <p className="text-xs text-muted-foreground">SSA</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-transparent text-primary'
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
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-transparent text-xs font-medium text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{user?.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user?.role] || user?.role}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Se déconnecter"
            className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive-dark"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
