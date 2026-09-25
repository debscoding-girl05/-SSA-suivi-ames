import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardList, Plus, Download, Trash2, Pencil, ChevronRight, Check, Camera, ImageUp, PenLine, ArrowLeft } from 'lucide-react';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { listRapportsHebdo, getRapportHebdo, deleteRapportHebdo, downloadRapportHebdoPdf } from '../../api/rapportsHebdo';
import { useAuth } from '../../hooks/useAuth';
import { rhTypesFor, rhLabel } from './types';
import { readsAllRole } from '@/lib/roles';
import HuissierForm from './HuissierForm';
import FaiseurDisciplesForm from './FaiseurDisciplesForm';
import SuperviseurForm from './SuperviseurForm';
import CellulePriereForm from './CellulePriereForm';
import ChoristesForm from './ChoristesForm';
import AudiovisuelForm from './AudiovisuelForm';
import LeaderMensuelForm from './LeaderMensuelForm';
import PhotoFicheForm from './PhotoFicheForm';

// Registre des formulaires par type.
const FORMS = {
  huissier: HuissierForm,
  faiseur_disciples: FaiseurDisciplesForm,
  superviseur: SuperviseurForm,
  cellule_priere: CellulePriereForm,
  choristes: ChoristesForm,
  audiovisuel: AudiovisuelForm,
  leader_mensuel: LeaderMensuelForm,
};

export default function RapportsHebdoPage() {
  const { user } = useAuth();
  const isAdmin = readsAllRole(user?.role);
  const types = rhTypesFor(user?.role);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [picker, setPicker] = useState(false);       // choix du type (création)
  const [pickedType, setPickedType] = useState(null); // 2e étape : photo / import / saisie
  const [modal, setModal] = useState(null);           // { type, report? }
  const [toast, setToast] = useState('');             // message de succès éphémère

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

  function handleSaved(saved, status) {
    load();
    if (!saved) { setModal(null); return; } // fiche photo gardée en brouillon
    if (status === 'soumis') {
      setModal(null);
      const a = saved.annuaire;
      const extra = a && (a.added || a.existing)
        ? ` · ${a.added} personne${a.added > 1 ? 's' : ''} ajoutée${a.added > 1 ? 's' : ''} à l'annuaire${a.existing ? `, ${a.existing} déjà présente${a.existing > 1 ? 's' : ''}` : ''}`
        : '';
      setToast(`Fiche soumise avec succès${extra}`);
      setTimeout(() => setToast(''), 4000);
    }
  }

  function openPicker() { setPickedType(null); setPicker(true); }
  function startManual(type) { setPicker(false); setModal({ type }); }
  function startPhoto(type, fileList) {
    const files = [...(fileList || [])];
    if (!files.length) return;
    setPicker(false);
    setModal({ type, photoFiles: files });
  }

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
      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg">
            <Check className="size-4" /> {toast}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rapports hebdomadaires</h1>
          <p className="text-sm text-muted-foreground">Fiches hebdomadaires par département et rapports mensuels des leaders, exportables en PDF.</p>
        </div>
        <Button onClick={openPicker}>
          <Plus className="size-4" /> Nouveau rapport
        </Button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
      ) : data.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucun rapport" description="Créez votre premier rapport hebdomadaire."
          action={<Button size="sm" onClick={openPicker}><Plus className="size-4" /> Nouveau rapport</Button>} />
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
      <Modal open={picker} onClose={() => setPicker(false)} title={pickedType ? rhLabel(pickedType) : 'Quel type de rapport ?'}>
        {pickedType ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Comment voulez-vous remplir cette fiche ?</p>
            {[
              { key: 'camera', icon: Camera, label: 'Prendre une photo de la fiche', hint: "Ouvre l'appareil photo", capture: true },
              { key: 'import', icon: ImageUp, label: 'Importer une image', hint: 'Depuis la galerie ou les fichiers', capture: false },
            ].map((o) => (
              <label key={o.key} className="lift flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary-transparent text-primary"><o.icon className="size-5" /></span>
                <span className="flex flex-col"><span className="font-medium">{o.label}</span><span className="text-xs text-muted-foreground">{o.hint}</span></span>
                <input type="file" accept="image/*" className="hidden" {...(o.capture ? { capture: 'environment' } : { multiple: true })}
                  onChange={(e) => startPhoto(pickedType, e.target.files)} />
              </label>
            ))}
            <button type="button" onClick={() => startManual(pickedType)}
              className="lift flex min-h-[56px] items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-card">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary-transparent text-primary"><PenLine className="size-5" /></span>
              <span className="flex flex-col"><span className="font-medium">Remplir manuellement</span><span className="text-xs text-muted-foreground">Saisir la fiche à l'écran</span></span>
            </button>
            <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setPickedType(null)}>
              <ArrowLeft className="size-4" /> Changer de type
            </Button>
          </div>
        ) : (
        <ul className="flex flex-col gap-2">
          {types.map((t) => (
            <li key={t.key}>
              <button type="button" onClick={() => setPickedType(t.key)}
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
        )}
      </Modal>

      {/* Formulaire du type choisi */}
      <Modal size={modal?.photoFiles ? 'md' : modal?.type === 'choristes' || modal?.type === 'audiovisuel' ? 'full' : 'xl'} open={!!modal} onClose={closeModal} title={modal ? rhLabel(modal.type) : ''}>
        {modal?.photoFiles ? (
          <PhotoFicheForm type={modal.type} files={modal.photoFiles} onSaved={handleSaved} />
        ) : modal && FormComponent && (
          <FormComponent initial={modal.report} onSaved={handleSaved} />
        )}
      </Modal>
    </div>
  );
}
