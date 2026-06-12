import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bell, AlertCircle, Clock, RotateCcw, AlertTriangle, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../../api/notifications';
import EmptyState from '../../components/EmptyState';

const ICON = {
  fiche_manquante: { Icon: AlertCircle, cls: 'bg-destructive text-destructive-foreground' },
  a_valider: { Icon: Clock, cls: 'bg-primary-transparent text-primary' },
  a_corriger: { Icon: RotateCcw, cls: 'bg-warning text-warning-foreground' },
  stagnation: { Icon: AlertTriangle, cls: 'bg-warning text-warning-foreground' },
};

function timeAgo(iso) {
  if (!iso) return '';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return "à l'instant";
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setData((await listNotifications()).data); } catch { /* noop */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  async function open(n) {
    if (!n.isRead) { try { await markNotificationRead(n.id); } catch { /* noop */ } }
    if (n.link) navigate(n.link);
  }
  async function allRead() {
    try { await markAllNotificationsRead(); await load(); } catch { /* noop */ }
  }

  const unread = data.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">{unread} non lue{unread > 1 ? 's' : ''}</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={allRead}>
            <CheckCheck className="size-4" /> Tout marquer comme lu
          </Button>
        )}
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border border-border bg-card" />
      ) : data.length === 0 ? (
        <EmptyState icon={Bell} title="Aucune notification" description="Vous êtes à jour." />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {data.map((n) => {
            const { Icon, cls } = ICON[n.type] || { Icon: Bell, cls: 'bg-muted text-muted-foreground' };
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => open(n)}
                  className={cn('flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/50', !n.isRead && 'bg-primary-transparent/40')}
                >
                  <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', cls)}><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      {!n.isRead && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground/70">{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
