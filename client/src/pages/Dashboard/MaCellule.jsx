import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, UserPlus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listCellules, addMembreCellule } from '../../api/cellules';
import ReportStatusBadge from '../../components/ReportStatusBadge';
import Modal from '../../components/Modal';

// Accueil du leader de cellule : sa (ses) cellule(s), l'état de la fiche de
// la semaine et l'ajout direct d'un membre.
export default function MaCellule() {
  const [cellules, setCellules] = useState(null);
  const [target, setTarget] = useState(null); // cellule où l'on ajoute
  const [form, setForm] = useState({ nom: '', telephone: '', estMembreEglise: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    listCellules().then((res) => setCellules(res.data)).catch(() => setCellules([]));
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  function open(c) { setTarget(c); setForm({ nom: '', telephone: '', estMembreEglise: false }); setError(''); }
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await addMembreCellule(target.id, form); setTarget(null); load(); }
    catch (err) { setError(err?.message || 'Ajout impossible.'); }
    finally { setBusy(false); }
  }

  if (!cellules) return <div className="h-28 animate-pulse rounded-2xl border border-border bg-card" />;
  if (!cellules.length) return null;

  return (
    <div className="flex flex-col gap-3">
      {cellules.map((c) => (
        <div key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <Link to={`/cellules/${c.id}`} className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-transparent text-primary"><HeartHandshake className="size-5" /></span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{c.nom}</span>
                <span className="block truncate text-xs text-muted-foreground">{c.quartier || 'Sans quartier'} · {c.membreCount} membre{c.membreCount > 1 ? 's' : ''}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
            <ReportStatusBadge status={c.ficheStatus === 'soumis' || c.ficheStatus === 'valide' ? c.ficheStatus : 'manquant'} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => open(c)}><UserPlus className="size-4" /> Ajouter un membre</Button>
            <Link to={`/cellules/${c.id}`} className="inline-flex min-h-[32px] items-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted">Fiche de présence</Link>
          </div>
        </div>
      ))}
      <Modal open={!!target} onClose={() => setTarget(null)} title={target ? `Ajouter un membre — ${target.nom}` : ''}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">Nom *
            <Input id="mc-nom" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required autoFocus />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">Téléphone
            <Input id="mc-tel" type="tel" value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.estMembreEglise} onChange={(e) => setForm((f) => ({ ...f, estMembreEglise: e.target.checked }))} className="size-4 accent-[var(--primary)]" />
            Membre de l'église
          </label>
          {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setTarget(null)}>Annuler</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Ajout…' : 'Ajouter'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
