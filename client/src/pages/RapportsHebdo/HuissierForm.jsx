import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Download, Send } from 'lucide-react';
import { createRapportHebdo, updateRapportHebdo, downloadRapportHebdoPdf } from '../../api/rapportsHebdo';
import ReprendreDerniereFiche from './ReprendreDerniereFiche';
import RapportAttachments from './RapportAttachments';
import { fetchOwnAssignes } from './carryForward';
import { useAuth } from '../../hooks/useAuth';

const emptyRow = () => ({ nom: '', telephone: '', lieu: '', numeroCulte: '', present: null });
// Garde l'identité de la personne, efface ce qui change chaque semaine.
const resetRow = (r) => ({ nom: r.nom || '', telephone: r.telephone || '', lieu: r.lieu || '', numeroCulte: '', present: null });

// Un téléphone valide = uniquement des chiffres (espaces tolérés).
const phoneHasInvalid = (v) => /[^0-9\s]/.test(v || '');

export default function HuissierForm({ initial, onSaved }) {
  const { user } = useAuth();
  const [id, setId] = useState(initial?.id || null);
  const [entete, setEntete] = useState({
    departement: initial?.entete?.departement || 'Huissier',
    date: initial?.entete?.date || '',
    nomLeader: initial?.entete?.nomLeader || '',
  });
  const [lignes, setLignes] = useState(
    initial?.lignes?.length ? initial.lignes : [emptyRow(), emptyRow(), emptyRow()]
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  // Nouvelle fiche : pré-remplit avec la liste actuelle des assignés de
  // l'auteur — évite de retaper des noms qui sont déjà dans l'annuaire.
  // Ne touche à rien si l'utilisateur a déjà commencé à saisir une ligne.
  useEffect(() => {
    if (initial || !user?.id) return;
    let cancelled = false;
    fetchOwnAssignes(user.id).then((assignes) => {
      if (cancelled || !assignes.length) return;
      const roster = assignes.map((a) => resetRow({ nom: `${a.firstName} ${a.lastName}`.trim(), telephone: a.phone || '' }));
      setLignes((current) => (current.every((r) => !(r.nom || '').trim()) ? roster : current));
    });
    return () => { cancelled = true; };
  }, [initial, user?.id]);

  // Total de présents calculé automatiquement (cases « P » cochées).
  const totalPresents = useMemo(
    () => lignes.filter((r) => r.present === true).length,
    [lignes]
  );

  function setRow(i, patch) {
    setLignes((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() { setLignes((rows) => [...rows, emptyRow()]); }
  function removeRow(i) { setLignes((rows) => rows.filter((_, idx) => idx !== i)); }

  const nomLeaderInvalid = !entete.nomLeader.trim();

  async function save(status) {
    // Validation : nom du leader obligatoire.
    if (!entete.nomLeader.trim()) {
      setShowErrors(true);
      setError('Le nom du leader est obligatoire.');
      return null;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        type: 'huissier',
        entete: { ...entete, totalPresents },
        lignes: lignes.filter((r) => (r.nom || '').trim() !== ''),
        status,
      };
      let saved;
      if (id) saved = await updateRapportHebdo(id, payload);
      else { saved = await createRapportHebdo(payload); setId(saved.id); }
      onSaved?.(saved, status);
      return saved;
    } catch (err) {
      setError(err?.message || 'Enregistrement impossible.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    const saved = await save('soumis');
    if (saved) setError('');
    return saved;
  }

  async function downloadCurrent() {
    // Sauvegarde d'abord l'état courant (sans changer le statut) puis télécharge.
    const saved = await save(initial?.status || 'brouillon');
    if (!saved) return;
    try { await downloadRapportHebdoPdf(saved.id, 'rapport-assiduite'); }
    catch (e) { setError(e?.message || 'Téléchargement impossible.'); }
  }

  async function ensureSavedId() {
    if (id) return id;
    const saved = await save(initial?.status || 'brouillon');
    return saved?.id || null;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* En-tête */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Département
          <Input value={entete.departement} onChange={(e) => setEntete({ ...entete, departement: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Date
          <Input type="date" value={entete.date} onChange={(e) => setEntete({ ...entete, date: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Nom du leader <span className="text-destructive-dark">*</span>
          <Input
            value={entete.nomLeader}
            onChange={(e) => setEntete({ ...entete, nomLeader: e.target.value })}
            className={showErrors && nomLeaderInvalid ? 'border-destructive-dark focus-visible:ring-destructive-dark' : ''}
          />
          {showErrors && nomLeaderInvalid && (
            <span className="text-xs text-destructive-dark">Ce champ est obligatoire.</span>
          )}
        </label>
        <div className="flex flex-col gap-1.5 text-sm font-medium">
          Total de membres présents
          <div className="flex h-10 items-center rounded-md border border-border bg-muted/40 px-3 text-base font-semibold">
            {totalPresents}
            <span className="ml-2 text-xs font-normal text-muted-foreground">calculé automatiquement</span>
          </div>
        </div>
      </div>

      {/* Tableau des lignes */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 w-10">N°</th>
              <th className="px-3 py-2.5 min-w-[180px]">Nom</th>
              <th className="px-3 py-2.5 min-w-[140px]">Téléphone</th>
              <th className="px-3 py-2.5 min-w-[120px]">Lieu</th>
              <th className="px-3 py-2.5 w-24">N° Culte</th>
              <th className="px-3 py-2.5 w-28 text-center">Présence</th>
              <th className="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lignes.map((r, i) => {
              const badPhone = phoneHasInvalid(r.telephone);
              return (
                <tr key={i}>
                  <td className="px-3 py-2 text-center text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-2"><Input className="h-10" value={r.nom} onChange={(e) => setRow(i, { nom: e.target.value })} /></td>
                  <td className="px-2 py-2">
                    <Input
                      className={`h-10 ${badPhone ? 'border-destructive-dark text-destructive-dark focus-visible:ring-destructive-dark' : ''}`}
                      inputMode="numeric"
                      value={r.telephone}
                      onChange={(e) => setRow(i, { telephone: e.target.value })}
                      aria-invalid={badPhone}
                    />
                    {badPhone && <span className="mt-0.5 block text-xs text-destructive-dark">Chiffres uniquement</span>}
                  </td>
                  <td className="px-2 py-2"><Input className="h-10" value={r.lieu} onChange={(e) => setRow(i, { lieu: e.target.value })} /></td>
                  <td className="px-2 py-2"><Input className="h-10" value={r.numeroCulte} onChange={(e) => setRow(i, { numeroCulte: e.target.value })} /></td>
                  <td className="px-2 py-2">
                    <div className="flex justify-center gap-1.5">
                      <button type="button" onClick={() => setRow(i, { present: r.present === true ? null : true })}
                        className={`rounded-md px-3 py-1.5 text-sm font-semibold ${r.present === true ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>P</button>
                      <button type="button" onClick={() => setRow(i, { present: r.present === false ? null : false })}
                        className={`rounded-md px-3 py-1.5 text-sm font-semibold ${r.present === false ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>A</button>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button type="button" onClick={() => removeRow(i)} aria-label="Supprimer la ligne" className="text-muted-foreground hover:text-destructive-dark">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-4" /> Ajouter une ligne
        </Button>
        {!id && <ReprendreDerniereFiche type="huissier" currentId={id} resetRow={resetRow} onApply={setLignes} />}
      </div>

      <RapportAttachments rapportId={id} ensureId={ensureSavedId} disabled={initial?.status === 'valide'} />

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={() => downloadCurrent()} disabled={busy}>
          <Download className="size-4" /> Télécharger le PDF
        </Button>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => save('brouillon')} disabled={busy}>Enregistrer le brouillon</Button>
          <Button type="button" onClick={() => submit()} disabled={busy}>
            <Send className="size-4" /> {busy ? 'Envoi…' : 'Soumettre le rapport'}
          </Button>
        </div>
      </div>
    </div>
  );
}
