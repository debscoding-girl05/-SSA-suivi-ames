import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listNotifications } from '../api/notifications';

const REFRESH_MS = 60 * 1000; // vérification automatique toutes les 60 s

// Bell with unread badge. Refreshes on mount, on navigation, périodiquement
// (toutes les 60 s) et au retour sur l'onglet — pour que la pastille apparaisse
// d'elle-même sans avoir à ouvrir la cloche.
export function NotificationBell({ className }) {
  const [unread, setUnread] = useState(0);
  const location = useLocation();

  const refresh = useCallback(() => {
    listNotifications()
      .then((d) => setUnread(d.unread || 0))
      .catch(() => {});
  }, []);

  // Au montage + à chaque navigation.
  useEffect(() => { refresh(); }, [refresh, location.pathname]);

  // Vérification périodique en arrière-plan.
  useEffect(() => {
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Rafraîchit quand l'utilisateur revient sur l'onglet.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  return (
    <Link
      to="/notifications"
      aria-label={`Notifications${unread ? ` (${unread} non lues)` : ''}`}
      className={cn('relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground', className)}
    >
      <Bell className="size-5" />
      {unread > 0 && (
        <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive-dark px-1 text-[10px] font-semibold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}