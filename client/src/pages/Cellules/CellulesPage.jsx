import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { HeartHandshake, MapPin, Users, Plus, ChevronRight } from 'lucide-react';
import { listCellules, createCellule, celluleLeaders } from '../../api/cellules';
import { useAuth } from '../../hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import ReportStatusBadge from '../../components/ReportStatusBadge';

export default function CellulesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = isAdminRole(user?.role);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [leaders, setLeaders] = useState([]);
  const [form, setForm] = useState({ nom: '', quartier: '', leaderCelluleId: '' });

  const load = useCallback(async () => {
    try { setData((await listCellules()).data); setError(''); }
    catch (e) { setError(e?.message || 'Chargement impossible.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  async function openCreate() {
    setForm({ nom: '', quartier: '', leaderCelluleId: '' });
    if (canCreate) { try { setLeaders((await celluleLeaders()).data); } catch { setLeaders([]); } }
    setOpen(true);
  }
  async function create(e) {
    e.preventDefault();
    try { const c = await createCellule(form); setOpen(false); navigate(`/cellules/${c.id}`); }
    catch (er) { setError(er?.message || 'Création impossible.'); }
  }

  const leaderOptions = [{ value: '', label: '— Aucun —' }, ...leaders.map((l) => ({ value: l.id, label: l.fullName }))];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cellules de prière</h1>
          <p className="text-sm text-muted-foreground">Par quartier · indépendantes des départements</p>
        </div>
        {canCreate && <Button onClick={openCreate}><Plus className="size-4" /> Nouvelle cellule</Button>}
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />)}</div>
      ) : data.length === 0 ? (
        <EmptyState icon={HeartHandshake} title="Aucune cellule" description={canCreate ? 'Créez une cellule de prière pour démarrer.' : 'Aucune cellule dans votre périmètre.'} action={canCreate ? <Button size="sm" onClick={openCreate}><Plus className="size-4" /> Nouvelle cellule</Button> : null} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => navigate(`/cellules/${c.id}`)} className="lift flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-transparent text-primary"><HeartHandshake className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.nom}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="size-3.5" />{c.quartier || '—'}</span>
                    <span className="flex items-center gap-1"><Users className="size-3.5" />{c.membreCount}</span>
                  </div>
                </div>
                {c.ficheStatus && <ReportStatusBadge status={c.ficheStatus === 'soumis' ? 'soumis' : 'brouillon'} />}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle cellule">
        <form onSubmit={create} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="c-nom" className="text-sm font-medium">Nom *</label>
            <Input id="c-nom" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="c-q" className="text-sm font-medium">Quartier</label>
            <Input id="c-q" value={form.quartier} onChange={(e) => setForm((f) => ({ ...f, quartier: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Leader de cellule</span>
            <Select value={form.leaderCelluleId} onChange={(v) => setForm((f) => ({ ...f, leaderCelluleId: v }))} options={leaderOptions} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
