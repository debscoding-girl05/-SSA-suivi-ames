import { useState } from 'react';
import { Bell, Lock, LogOut, ChevronRight, Phone, Building2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { roleLabel } from '@/lib/roles';
import { Avatar } from '@/components/ui/avatar';
import Modal from '../../components/Modal';
import ChangePasswordForm from './ChangePasswordForm';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const rows = [
    { icon: Bell, label: 'Notifications' },
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
