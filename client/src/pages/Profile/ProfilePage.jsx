import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Lock, LogOut, ChevronRight, Phone, Building2, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { roleLabel } from '@/lib/roles';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Modal from '../../components/Modal';
import { changePassword } from '../../api/auth';

const EMPTY = { current: '', next: '', confirm: '' };

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [pwdOpen, setPwdOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function openPwd() { setForm(EMPTY); setError(''); setDone(false); setPwdOpen(true); }

  async function submitPwd(e) {
    e.preventDefault();
    setError('');
    if (form.next.length < 6) { setError('Le nouveau mot de passe doit contenir au moins 6 caractères.'); return; }
    if (form.next !== form.confirm) { setError('La confirmation ne correspond pas.'); return; }
    setBusy(true);
    try {
      await changePassword(form.current, form.next);
      setDone(true);
      setForm(EMPTY);
    } catch (err) {
      setError(err?.message || 'Changement impossible.');
    } finally { setBusy(false); }
  }

  const rows = [
    { icon: Bell, label: 'Notifications', onClick: () => navigate('/notifications') },
    { icon: Lock, label: 'Changer le mot de passe', onClick: openPwd },
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
            className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-muted"
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

      <Modal open={pwdOpen} onClose={() => setPwdOpen(false)} title="Changer le mot de passe">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-success text-success-foreground"><Check className="size-6" /></span>
            <p className="text-sm font-medium">Mot de passe mis à jour.</p>
            <Button onClick={() => setPwdOpen(false)}>Fermer</Button>
          </div>
        ) : (
          <form onSubmit={submitPwd} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="p-cur" className="text-sm font-medium">Mot de passe actuel *</label>
              <Input id="p-cur" type="password" value={form.current} onChange={setField('current')} required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="p-new" className="text-sm font-medium">Nouveau mot de passe *</label>
              <Input id="p-new" type="password" value={form.next} onChange={setField('next')} required minLength={6} />
              <p className="text-xs text-muted-foreground">Au moins 6 caractères.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="p-cfm" className="text-sm font-medium">Confirmer *</label>
              <Input id="p-cfm" type="password" value={form.confirm} onChange={setField('confirm')} required />
            </div>

            {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setPwdOpen(false)} disabled={busy}>Annuler</Button>
              <Button type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Mettre à jour'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
