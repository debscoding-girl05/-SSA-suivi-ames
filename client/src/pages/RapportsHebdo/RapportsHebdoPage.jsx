import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardList, Plus, Download, Trash2, Pencil, ChevronRight } from 'lucide-react';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { listRapportsHebdo, getRapportHebdo, deleteRapportHebdo, downloadRapportHebdoPdf } from '../../api/rapportsHebdo';
import { useAuth } from '../../hooks/useAuth';
import { RH_TYPES, rhLabel } from './types';
import HuissierForm from './HuissierForm';
import FaiseurDisciplesForm from './FaiseurDisciplesForm';
import SuperviseurForm from './SuperviseurForm';

// Registre des formulaires par type.
const FORMS = {
  huissier: HuissierForm,
  faiseur_disciples: FaiseurDisciplesForm,
  superviseur: SuperviseurForm,
};

export default function RapportsHebdoPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'pasteur' || user?.role === 'pr';

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [picker, setPicker] = useState(false);       // choix du type (création)
  const [modal, setModal] = useState(null);           // { type, report? }

  const load = useCallback(async () => {
    try {
      const res = await listRapportsHebdo();
      setData(res.data);
      setError('');
    } catch (err) {
      setError(err?.message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  function closeModal() { setModal(null); }

  function startCreate(type) { setPicker(false); setModal({ type }); }

  async function openEdit(row) {
    try {
      const full = await getRapportHebdo(row.id);
      setModal({ type: full.type, report: full });
    } catch (e) { setError(e?.message || 'Ouverture impossible.'); }
  }

  async function onDelete(row) {
    if (!window.confirm('Supprimer ce rapport ?')) return;
    try { await deleteRapportHebdo(row.id); load(); }
    catch (e) { setError(e?.message || 'Suppression impossible.'); }
  }

  async function onDownload(row) {
    try { await downloadRapportHebdoPdf(row.id, 'rapport'); }
    catch (e) { setError(e?.message || 'Téléchargement impossible.'); }
  }

  const FormComponent = modal ? FORMS[modal.type] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rapports hebdomadaires</h1>
          <p className="text-sm text-muted-foreground">Fiches structurées par département, exportables en PDF.</p>
        </div>
        <Button onClick={() => setPicker(true)}>
          <Plus className="size-4" /> Nouveau rapport
        </Button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
      ) : data.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucun rapport" description="Créez votre premier rapport hebdomadaire."
          action={<Button size="sm" onClick={() => setPicker(true)}><Plus className="size-4" /> Nouveau rapport</Button>} />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
              <div className="min-w-0">
                <p className="font-medium">{rhLabel(r.type)}</p>
                <p className="text-xs text-muted-foreground">
                  {r.entete?.departement ? `${r.entete.departement}` : 'Rapport'}
                  {' · '}
                  <span className={r.status === 'soumis' ? 'font-medium text-primary' : r.status === 'valide' ? 'font-medium text-success-foreground-light' : ''}>
                    {r.status === 'soumis' ? 'Soumis' : r.status === 'valide' ? 'Validé' : 'Brouillon'}
                  </span>
                  {r.lignes?.length ? ` · ${r.lignes.length} ligne(s)` : ''}
                  {isAdmin && (r.entete?.nomLeader || r.entete?.nomFaiseur || r.authorName) ? ` · par ${r.entete?.nomLeader || r.entete?.nomFaiseur || r.authorName}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" onClick={() => onDownload(r)}><Download className="size-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="size-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(r)}><Trash2 className="size-4 text-destructive-dark" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Choix du type de fiche */}
      <Modal open={picker} onClose={() => setPicker(false)} title="Quel type de rapport ?">
        <ul className="flex flex-col gap-2">
          {RH_TYPES.map((t) => (
            <li key={t.key}>
              <button type="button" onClick={() => startCreate(t.key)}
                className="lift flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-card">
                <span className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary-transparent text-primary"><ClipboardList className="size-5" /></span>
                  <span className="font-medium">{t.label}</span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </Modal>

      {/* Formulaire du type choisi */}
      <Modal size="xl" open={!!modal} onClose={closeModal} title={modal ? rhLabel(modal.type) : ''}>
        {modal && FormComponent && (
          <FormComponent initial={modal.report} onSaved={() => load()} />
        )}
      </Modal>
    </div>
  );
}
