import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ArrowLeft, MapPin, Users, Plus, Trash2, ClipboardCheck, Pencil } from 'lucide-react';
import { getCellule, addMembreCellule, updateMembreCellule, removeMembreCellule, updateCellule, celluleLeaders, validateFicheCellule } from '../../api/cellules';
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
  const [editingMembre, setEditingMembre] = useState(null); // membre en édition, ou null = ajout
  const [form, setForm] = useState({ nom: '', telephone: '', estMembreEglise: false });
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ nom: '', quartier: '', leaderCelluleId: '' });
  const [leaders, setLeaders] = useState([]);

  const load = useCallback(async () => {
    try { setData(await getCellule(id)); setError(''); }
    catch (e) { setError(e?.message || 'Chargement impossible.'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const canManage = data && (isAdminRole(user?.role) || (user?.role === 'leader_cellule' && data.cellule.leaderCelluleId === user?.id));
  // Seuls Pasteur/PR éditent la cellule (nom, quartier, leader).
  const canEdit = isAdminRole(user?.role);

  async function openEdit() {
    setEditForm({ nom: data.cellule.nom, quartier: data.cellule.quartier || '', leaderCelluleId: data.cellule.leaderCelluleId || '' });
    try { setLeaders((await celluleLeaders()).data); } catch { setLeaders([]); }
    setEditOpen(true);
  }
  async function submitEdit(e) {
    e.preventDefault();
    try { await updateCellule(id, { ...editForm, leaderCelluleId: editForm.leaderCelluleId || null }); setEditOpen(false); load(); }
    catch (er) { setError(er?.message || 'Modification impossible.'); }
  }

  function openAddMembre() { setEditingMembre(null); setForm({ nom: '', telephone: '', estMembreEglise: false }); setAddOpen(true); }
  function openEditMembre(m) { setEditingMembre(m); setForm({ nom: m.nom, telephone: m.telephone || '', estMembreEglise: m.estMembreEglise }); setAddOpen(true); }
  async function saveMembre(e) {
    e.preventDefault();
    try {
      if (editingMembre) await updateMembreCellule(id, editingMembre.id, form);
      else await addMembreCellule(id, form);
      setAddOpen(false); setEditingMembre(null); setForm({ nom: '', telephone: '', estMembreEglise: false }); load();
    } catch (er) { setError(er?.message || 'Enregistrement impossible.'); }
  }
  async function removeMembre(m) {
    if (!window.confirm(`Retirer ${m.nom} ?`)) return;
    try { await removeMembreCellule(id, m.id); load(); } catch (er) { setError(er?.message || 'Suppression impossible.'); }
  }

  // Valider la fiche soumise de la semaine (remontée à la PR/au Pasteur).
  async function handleValidate() {
    try { await validateFicheCellule(id); load(); } catch (er) { setError(er?.message || 'Validation impossible.'); }
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
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-xl font-semibold tracking-tight">{data.cellule.nom}</h1>
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={openEdit}><Pencil className="size-4" /> Modifier</Button>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {data.cellule.quartier && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{data.cellule.quartier}</span>}
                <span>Leader : {data.cellule.leaderName || '—'}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" onClick={() => setFicheOpen(true)} disabled={!canManage}>
                  <ClipboardCheck className="size-4" /> Fiche de présence
                </Button>
                {data.fiche && <ReportStatusBadge status={data.fiche.status === 'soumis' ? 'soumis' : data.fiche.status === 'valide' ? 'valide' : 'brouillon'} />}
                {isAdminRole(user?.role) && data.fiche?.status === 'soumis' && (
                  <Button size="sm" variant="outline" onClick={handleValidate}>Valider</Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="size-4" /> Membres ({data.membres.length})
              </h2>
              {canManage && <Button size="sm" onClick={openAddMembre}><Plus className="size-4" /> Ajouter</Button>}
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
                    {canManage && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEditMembre(m)} aria-label="Modifier"><Pencil className="size-4" /></Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => removeMembre(m)} aria-label="Retirer"><Trash2 className="size-4 text-destructive-dark" /></Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier la cellule">
        <form onSubmit={submitEdit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="e-nom" className="text-sm font-medium">Nom *</label>
            <Input id="e-nom" value={editForm.nom} onChange={(e) => setEditForm((f) => ({ ...f, nom: e.target.value }))} required autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="e-q" className="text-sm font-medium">Quartier</label>
            <Input id="e-q" value={editForm.quartier} onChange={(e) => setEditForm((f) => ({ ...f, quartier: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Leader de cellule</span>
            <Select
              value={editForm.leaderCelluleId}
              onChange={(v) => setEditForm((f) => ({ ...f, leaderCelluleId: v }))}
              options={[{ value: '', label: '— Aucun —' }, ...leaders.map((l) => ({ value: l.id, label: l.fullName }))]}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>

      <Modal open={ficheOpen} onClose={() => setFicheOpen(false)} title="Fiche de présence de la cellule">
        {data && <CelluleFicheForm celluleId={id} membres={data.membres} fiche={data.fiche} onSaved={() => { setFicheOpen(false); load(); }} onCancel={() => setFicheOpen(false)} />}
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={editingMembre ? 'Modifier le membre' : 'Ajouter un membre'}>
        <form onSubmit={saveMembre} className="flex flex-col gap-4">
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
            <Button type="submit">{editingMembre ? 'Enregistrer' : 'Ajouter'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
