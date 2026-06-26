import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserCog, Plus, Phone, Mail, HeartHandshake, ArrowLeft } from 'lucide-react';
import { celluleLeaders, createCelluleLeader } from '../../api/cellules';
import { useAuth } from '../../hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

const EMPTY = { fullName: '', phone: '', email: '', password: '' };

export default function LeadersCellulePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setData((await celluleLeaders()).data); setError(''); }
    catch (e) { setError(e?.message || 'Chargement impossible.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  // Réservé au Pasteur / PR.
  if (user && !isAdminRole(user.role)) return <Navigate to="/cellules" replace />;

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function openCreate() { setForm(EMPTY); setFormError(''); setOpen(true); }

  async function create(e) {
    e.preventDefault();
    setFormError(''); setBusy(true);
    try {
      await createCelluleLeader(form);
      setOpen(false);
      await load();
    } catch (er) {
      setFormError(er?.message || 'Création impossible.');
    } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={() => navigate('/cellules')} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Cellules
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leaders de cellule</h1>
          <p className="text-sm text-muted-foreground">Comptes des responsables de cellules de prière</p>
        </div>
        <Button onClick={openCreate}><Plus className="size-4" /> Nouveau leader</Button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border border-border bg-card" />
      ) : data.length === 0 ? (
        <EmptyState icon={UserCog} title="Aucun leader de cellule" description="Créez un compte pour qu'un responsable puisse gérer sa cellule et soumettre les fiches de présence." action={<Button size="sm" onClick={openCreate}><Plus className="size-4" /> Nouveau leader</Button>} />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {data.map((l) => (
            <li key={l.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-transparent text-primary"><UserCog className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{l.fullName}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {l.phone && <span className="flex items-center gap-1"><Phone className="size-3.5" />{l.phone}</span>}
                  {l.email && !l.email.endsWith('@ssa.local') && <span className="flex items-center gap-1"><Mail className="size-3.5" />{l.email}</span>}
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <HeartHandshake className="size-3.5" /> {l.celluleCount} cellule{l.celluleCount > 1 ? 's' : ''}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nouveau leader de cellule">
        <form onSubmit={create} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="l-nom" className="text-sm font-medium">Nom complet *</label>
            <Input id="l-nom" value={form.fullName} onChange={setField('fullName')} required autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="l-tel" className="text-sm font-medium">Téléphone *</label>
            <Input id="l-tel" type="tel" inputMode="tel" value={form.phone} onChange={setField('phone')} required />
            <p className="text-xs text-muted-foreground">Sert d'identifiant de connexion.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="l-email" className="text-sm font-medium">Email (optionnel)</label>
            <Input id="l-email" type="email" value={form.email} onChange={setField('email')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="l-mdp" className="text-sm font-medium">Mot de passe *</label>
            <Input id="l-mdp" type="password" value={form.password} onChange={setField('password')} required minLength={6} />
            <p className="text-xs text-muted-foreground">Au moins 6 caractères. À communiquer au leader.</p>
          </div>

          {formError && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{formError}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Annuler</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Création…' : 'Créer le compte'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
