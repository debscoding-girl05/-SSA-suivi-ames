import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listNotifications } from '../api/notifications';

// Bell with unread badge. Refreshes on mount and on navigation.
export function NotificationBell({ className }) {
  const [unread, setUnread] = useState(0);
  const location = useLocation();

  useEffect(() => {
    let on = true;
    listNotifications()
      .then((d) => { if (on) setUnread(d.unread || 0); })
      .catch(() => {});
    return () => { on = false; };
  }, [location.pathname]);

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
