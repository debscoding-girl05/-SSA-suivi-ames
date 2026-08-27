import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, Lock, LogOut, ChevronRight, Phone, Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { roleLabel } from '@/lib/roles';
import { Avatar } from '@/components/ui/avatar';
import Modal from '../../components/Modal';
import ChangePasswordForm from './ChangePasswordForm';
import { getPushStatus, subscribeToPush, unsubscribeFromPush } from '@/lib/push';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState('checking'); // checking | unsupported | denied | subscribed | not-subscribed
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => getPushStatus().then(setPushStatus).catch(() => setPushStatus('unsupported')), 0);
    return () => clearTimeout(t);
  }, []);

  async function togglePush() {
    setPushError('');
    setPushBusy(true);
    try {
      if (pushStatus === 'subscribed') {
        await unsubscribeFromPush();
        setPushStatus('not-subscribed');
      } else {
        await subscribeToPush();
        setPushStatus('subscribed');
      }
    } catch (err) {
      setPushError(err?.message || 'Action impossible.');
    } finally {
      setPushBusy(false);
    }
  }

  const rows = [
    { icon: Bell, label: 'Notifications', onClick: () => navigate('/notifications') },
    { icon: Lock, label: 'Changer le mot de passe', onClick: () => setPasswordModalOpen(true) },
  ];

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      {/* Carte profil avec bannière dégradée */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="h-20 bg-primary-gradient" />
        <div className="flex flex-col items-center px-5 pb-5 text-center">
          <Avatar name={user?.fullName || user?.email} size="lg" className="-mt-9 ring-4 ring-card" />
          <p className="mt-2 text-lg font-semibold">{user?.fullName}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <span className="mt-2 rounded-md bg-primary-transparent px-2.5 py-0.5 text-xs font-medium text-primary">
            {roleLabel(user?.role)}
          </span>
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            {user?.departmentName && (
              <span className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1">
                <Building2 className="size-3.5" />{user.departmentName}
              </span>
            )}
            {user?.phone && (
              <span className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1">
                <Phone className="size-3.5" />{user.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {rows.map(({ icon: Icon, label, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            disabled={!onClick}
            className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </span>
            <span className="flex-1 text-sm font-medium">{label}</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {pushStatus !== 'unsupported' && (
        <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <BellRing className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Notifications sur cet appareil</p>
              <p className="text-xs text-muted-foreground">
                {pushStatus === 'denied'
                  ? 'Bloquées dans les réglages du navigateur.'
                  : pushStatus === 'subscribed'
                    ? 'Activées — vous serez prévenu même app fermée.'
                    : 'Recevez un rappel même sans ouvrir l’appli.'}
              </p>
            </div>
            {pushStatus === 'checking' ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : pushStatus !== 'denied' ? (
              <button
                type="button"
                role="switch"
                aria-checked={pushStatus === 'subscribed'}
                onClick={togglePush}
                disabled={pushBusy}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${pushStatus === 'subscribed' ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${pushStatus === 'subscribed' ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            ) : null}
          </div>
          {pushError && <p role="alert" className="text-xs text-destructive-dark">{pushError}</p>}
        </div>
      )}

      <button
        type="button"
        onClick={logout}
        className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm font-medium text-destructive-dark shadow-card transition-colors hover:bg-destructive"
      >
        <LogOut className="size-4" />
        Se déconnecter
      </button>

      <Modal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} title="Changer le mot de passe">
        <ChangePasswordForm onDone={() => setPasswordModalOpen(false)} onCancel={() => setPasswordModalOpen(false)} />
      </Modal>
    </div>
  );
}
