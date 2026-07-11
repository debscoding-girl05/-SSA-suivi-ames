import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil, Users, CalendarDays, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { getCellule, getFicheCellule, submitFicheCellule, validateFicheCellule } from '../../api/cellules';
import { useAuth } from '../../hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import Modal from '../../components/Modal';
import CelluleForm from './CelluleForm';
import ReportStatusBadge from '../../components/ReportStatusBadge';
import Input from '../../components/Input/Input';
import { Avatar } from '@/components/ui/avatar';

export default function CelluleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [cellule, setCellule] = useState(null);
  const [fiche, setFiche] = useState(null);
  const [week, setWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [presentCount, setPresentCount] = useState('');
  const [effectif, setEffectif] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const canManage = isAdminRole(user?.role) ||
    (user?.role === 'leader' && user?.departmentId != null && user?.departmentId === cellule?.departmentId);
  const canSubmit = canManage || cellule?.leaderId === user?.id;

  const load = useCallback(async () => {
    try {
      const c = await getCellule(id);
      setCellule(c);
      const f = await getFicheCellule(id);
      setFiche(f.fiche);
      setWeek(f.week);
      setPresentCount(f.fiche?.presentCount ?? '');
      setEffectif(f.fiche?.effectif ?? c.memberCount ?? '');
      setNotes(f.fiche?.notes ?? '');
      setError('');
    } catch (err) {
      setError(err?.message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function handleSubmitFiche(e, status = 'soumis') {
    e?.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await submitFicheCellule(id, {
        presentCount: Number(presentCount) || 0,
        effectif: Number(effectif) || 0,
        notes: notes || null,
        status,
      });
      await load();
      setSuccess(status === 'soumis' ? 'Fiche soumise avec succès — elle est en attente de validation.' : 'Brouillon enregistré.');
    } catch (err) {
      setError(err?.message || 'Envoi impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function handleValidate() {
    if (!fiche) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await validateFicheCellule(id, fiche.id);
      await load();
      setSuccess('Fiche validée — elle est remontée au département.');
    } catch (err) {
      setError(err?.message || 'Validation impossible.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />;
  if (!cellule) return <p className="text-sm text-muted-foreground">Cellule introuvable.</p>;

  const status = fiche?.status || 'manquant';

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={() => navigate('/cellules')} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Retour aux cellules
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{cellule.nom}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {cellule.leaderName && <span className="flex items-center gap-1"><Avatar name={cellule.leaderName} size="sm" />{cellule.leaderName}</span>}
            {cellule.jourReunion && <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{cellule.jourReunion}</span>}
            {cellule.lieu && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{cellule.lieu}</span>}
            <span className="flex items-center gap-1"><Users className="size-3.5" />{cellule.members?.length ?? 0} membre{(cellule.members?.length ?? 0) > 1 ? 's' : ''}</span>
          </div>
        </div>
        {canManage && (
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Modifier
          </Button>
        )}
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}
      {success && <p role="status" className="rounded-lg bg-primary-transparent px-3 py-2 text-sm text-primary">{success}</p>}

      {/* Fiche hebdomadaire */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Fiche hebdomadaire {week ? `· semaine ${week.week}/${week.year}` : ''}
          </h2>
          <ReportStatusBadge status={status} />
        </div>

        {canSubmit ? (
          <form onSubmit={(e) => handleSubmitFiche(e, 'soumis')} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="presentCount" className="text-sm font-medium">Présents</label>
                <Input id="presentCount" type="number" min="0" value={presentCount} onChange={(e) => setPresentCount(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="effectif" className="text-sm font-medium">Effectif total</label>
                <Input id="effectif" type="number" min="0" value={effectif} onChange={(e) => setEffectif(e.target.value)} required />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-sm font-medium">Notes</label>
              <textarea
                id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button type="button" variant="outline" disabled={saving} onClick={(e) => handleSubmitFiche(e, 'brouillon')}>
                Enregistrer en brouillon
              </Button>
              <Button type="submit" disabled={saving}>
                <Send className="size-4" /> {saving ? 'Envoi…' : 'Soumettre'}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            {fiche ? `${fiche.presentCount} présent(s) sur ${fiche.effectif}.` : "Aucune fiche pour cette semaine."}
          </p>
        )}

        {canManage && status === 'soumis' && (
          <div className="flex justify-end border-t border-border pt-3">
            <Button onClick={handleValidate} disabled={saving}>
              <CheckCircle2 className="size-4" /> Valider (remonter au département)
            </Button>
          </div>
        )}
      </div>

      {/* Membres */}
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-sm font-semibold text-muted-foreground">Membres ({cellule.members?.length ?? 0})</h2>
        {(!cellule.members || cellule.members.length === 0) ? (
          <p className="text-sm text-muted-foreground">Aucun membre rattaché à cette cellule pour l'instant.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {cellule.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2">
                <Avatar name={`${m.firstName} ${m.lastName}`} size="sm" />
                <span className="text-sm font-medium">{m.firstName} {m.lastName}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier la cellule">
        <CelluleForm cellule={cellule} onSaved={() => { setEditOpen(false); load(); }} onCancel={() => setEditOpen(false)} />
      </Modal>
    </div>
  );
}
