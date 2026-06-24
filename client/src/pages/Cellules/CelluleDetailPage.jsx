import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MapPin, Users, Plus, Trash2, ClipboardCheck } from 'lucide-react';
import { getCellule, addMembreCellule, removeMembreCellule } from '../../api/cellules';
import { useAuth } from '../../hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import ReportStatusBadge from '../../components/ReportStatusBadge';
import CelluleFicheForm from './CelluleFicheForm';

export default function CelluleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ficheOpen, setFicheOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ nom: '', telephone: '', estMembreEglise: false });

  const load = useCallback(async () => {
    try { setData(await getCellule(id)); setError(''); }
    catch (e) { setError(e?.message || 'Chargement impossible.'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const canManage = data && (isAdminRole(user?.role) || (user?.role === 'leader_cellule' && data.cellule.leaderCelluleId === user?.id));

  async function addMembre(e) {
    e.preventDefault();
    try { await addMembreCellule(id, form); setAddOpen(false); setForm({ nom: '', telephone: '', estMembreEglise: false }); load(); }
    catch (er) { setError(er?.message || 'Ajout impossible.'); }
  }
  async function removeMembre(m) {
    if (!window.confirm(`Retirer ${m.nom} ?`)) return;
    try { await removeMembreCellule(id, m.id); load(); } catch (er) { setError(er?.message || 'Suppression impossible.'); }
  }

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={() => navigate('/cellules')} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Cellules
      </button>

      {loading ? <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
      : error ? <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>
      : !data ? null : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="h-14 bg-primary-gradient" />
            <div className="px-5 pb-5 pt-3">
              <h1 className="text-xl font-semibold tracking-tight">{data.cellule.nom}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {data.cellule.quartier && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{data.cellule.quartier}</span>}
                <span>Leader : {data.cellule.leaderName || '—'}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" onClick={() => setFicheOpen(true)} disabled={!canManage}>
                  <ClipboardCheck className="size-4" /> Fiche de présence
                </Button>
                {data.fiche && <ReportStatusBadge status={data.fiche.status === 'soumis' ? 'soumis' : 'brouillon'} />}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="size-4" /> Membres ({data.membres.length})
              </h2>
              {canManage && <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="size-4" /> Ajouter</Button>}
            </div>
            {data.membres.length === 0 ? (
              <EmptyState icon={Users} title="Aucun membre" description="Ajoutez les membres de la cellule (pas forcément membres de l'église)." />
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                {data.membres.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-sm font-medium">
                        {m.nom}
                        {!m.estMembreEglise && <span className="shrink-0 rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">Hors église</span>}
                      </p>
                      {m.telephone && <p className="text-xs text-muted-foreground">{m.telephone}</p>}
                    </div>
                    {canManage && <Button variant="ghost" size="icon-sm" onClick={() => removeMembre(m)} aria-label="Retirer"><Trash2 className="size-4 text-destructive-dark" /></Button>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <Modal open={ficheOpen} onClose={() => setFicheOpen(false)} title="Fiche de présence de la cellule">
        {data && <CelluleFicheForm celluleId={id} membres={data.membres} fiche={data.fiche} onSaved={() => { setFicheOpen(false); load(); }} onCancel={() => setFicheOpen(false)} />}
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Ajouter un membre">
        <form onSubmit={addMembre} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="m-nom" className="text-sm font-medium">Nom *</label>
            <Input id="m-nom" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="m-tel" className="text-sm font-medium">Téléphone</label>
            <Input id="m-tel" type="tel" value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <input type="checkbox" checked={form.estMembreEglise} onChange={(e) => setForm((f) => ({ ...f, estMembreEglise: e.target.checked }))} className="size-4 accent-[var(--primary)]" />
            <span className="text-sm font-medium">Membre de l'église</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
            <Button type="submit">Ajouter</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
