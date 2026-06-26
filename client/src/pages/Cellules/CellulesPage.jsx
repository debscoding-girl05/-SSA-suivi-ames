import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { HeartHandshake, MapPin, Users, Plus, ChevronRight, UserCog } from 'lucide-react';
import ProgressRing from '../../components/ProgressRing';
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

  const soumis = data.filter((c) => c.ficheStatus === 'soumis').length;
  // Remontée par quartier.
  const groups = useMemo(() => {
    const m = new Map();
    for (const c of data) {
      const k = c.quartier || 'Sans quartier';
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(c);
    }
    return [...m.entries()].map(([quartier, cells]) => ({ quartier, cells })).sort((a, b) => a.quartier.localeCompare(b.quartier, 'fr'));
  }, [data]);

  const Carte = (c) => (
    <button type="button" onClick={() => navigate(`/cellules/${c.id}`)} className="lift flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-transparent text-primary"><HeartHandshake className="size-5" /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{c.nom}</p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="size-3.5" />{c.membreCount}</span>
          {c.ficheStatus === 'soumis' && <span className="text-success-foreground-light">{c.presentCount} présent{c.presentCount > 1 ? 's' : ''}</span>}
          {c.leaderName && <span className="truncate">· {c.leaderName}</span>}
        </div>
      </div>
      {c.ficheStatus && <ReportStatusBadge status={c.ficheStatus === 'soumis' ? 'soumis' : 'brouillon'} />}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cellules de prière</h1>
          <p className="text-sm text-muted-foreground">Par quartier · indépendantes des départements</p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/cellules/leaders')}><UserCog className="size-4" /> Leaders</Button>
            <Button onClick={openCreate}><Plus className="size-4" /> Nouvelle cellule</Button>
          </div>
        )}
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />)}</div>
      ) : data.length === 0 ? (
        <EmptyState icon={HeartHandshake} title="Aucune cellule" description={canCreate ? 'Créez une cellule de prière pour démarrer.' : 'Aucune cellule dans votre périmètre.'} action={canCreate ? <Button size="sm" onClick={openCreate}><Plus className="size-4" /> Nouvelle cellule</Button> : null} />
      ) : (
        <>
          {/* Remontée PR/Pasteur : résumé global */}
          {canCreate && (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="grid flex-1 grid-cols-3 gap-3 text-center sm:text-left">
                <div><p className="text-2xl font-semibold tabular-nums">{data.length}</p><p className="text-xs text-muted-foreground">Cellules</p></div>
                <div><p className="text-2xl font-semibold tabular-nums text-success-foreground-light">{soumis}</p><p className="text-xs text-muted-foreground">Fiches soumises</p></div>
                <div><p className="text-2xl font-semibold tabular-nums text-destructive-dark">{data.length - soumis}</p><p className="text-xs text-muted-foreground">Manquantes</p></div>
              </div>
              <ProgressRing value={soumis} total={data.length} label="soumis" size={96} />
            </div>
          )}

          {/* Cellules groupées par quartier */}
          <div className="flex flex-col gap-5">
            {groups.map((g) => (
              <div key={g.quartier} className="flex flex-col gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <MapPin className="size-4" /> {g.quartier}
                  <span className="font-normal text-muted-foreground/70">· {g.cells.length}</span>
                </h2>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {g.cells.map((c) => <li key={c.id}>{Carte(c)}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </>
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
            {leaders.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Aucun leader disponible.{' '}
                <button type="button" onClick={() => { setOpen(false); navigate('/cellules/leaders'); }} className="font-medium text-primary underline-offset-2 hover:underline">Créer un leader de cellule</button>.
              </p>
            )}
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
