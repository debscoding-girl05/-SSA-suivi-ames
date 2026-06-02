import { Bell, Lock, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const ROLE_LABELS = { admin: 'Administrateur', leader: 'Responsable', volunteer: 'Encadreur' };

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const initials = (user?.fullName || user?.email || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const rows = [
    { icon: Bell, label: 'Notifications' },
    { icon: Lock, label: 'Changer le mot de passe' },
  ];

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary-transparent text-lg font-semibold text-primary">
          {initials}
        </div>
        <div>
          <p className="text-lg font-semibold">{user?.fullName}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <span className="rounded-md bg-primary-transparent px-2.5 py-0.5 text-xs font-medium text-primary">
          {ROLE_LABELS[user?.role] || user?.role}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {rows.map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-muted"
          >
            <Icon className="size-5 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium">{label}</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={logout}
        className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-medium text-destructive-dark transition-colors hover:bg-destructive"
      >
        <LogOut className="size-4" />
        Se déconnecter
      </button>
    </div>
  );
}
