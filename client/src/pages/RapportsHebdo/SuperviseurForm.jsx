import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Download, Send, BookUser, Check } from 'lucide-react';
import { createRapportHebdo, updateRapportHebdo, downloadRapportHebdoPdf } from '../../api/rapportsHebdo';
import { listFaiseurs } from '../../api/dirigeants';
import ReprendreDerniereFiche from './ReprendreDerniereFiche';
import RapportAttachments from './RapportAttachments';
import AmePicker from './AmePicker';

// faiseurId : compte du Faiseur de Disciples choisi dans la liste (l'âme lui
// sera rattachée) ; faiseurLibre : nom saisi à la main (personne sans compte).
// assigneId : âme choisie dans l'annuaire (évite tout doublon).
const emptyRow = () => ({ faiseur: '', faiseurId: '', faiseurLibre: false, telephone: '', nomsAme: '', assigneId: '', commentaires: '' });
const resetRow = (r) => ({
  faiseur: r.faiseur || '', faiseurId: r.faiseurId || '', faiseurLibre: Boolean(r.faiseurLibre),
  telephone: r.telephone || '', nomsAme: r.nomsAme || '', assigneId: r.assigneId || '', commentaires: '',
});
const phoneHasInvalid = (v) => /[^0-9\s]/.test(String(v || '').replace(/^\s*\+/, ''));
const SELECT = 'border-input bg-background text-foreground h-10 w-full rounded-md border px-2 text-sm';
const OTHER = '__autre';

// Fiche des Encadreurs (Département du Suivi) — anciennement « Superviseurs »,
// le type reste `superviseur` en base pour ne pas casser les fiches existantes.
export default function SuperviseurForm({ initial, onSaved }) {
  const [id, setId] = useState(initial?.id || null);
  const [entete, setEntete] = useState({
    nomSuperviseur: initial?.entete?.nomSuperviseur || '',
    telephone: initial?.entete?.telephone || '',
    date: initial?.entete?.date || '',
  });
  const [lignes, setLignes] = useState(
    initial?.lignes?.length ? initial.lignes : [emptyRow(), emptyRow(), emptyRow()]
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [faiseurs, setFaiseurs] = useState([]);
  const [picking, setPicking] = useState(null); // index de la ligne qui choisit une âme

  useEffect(() => {
    listFaiseurs().then((res) => setFaiseurs(res.data)).catch(() => setFaiseurs([]));
  }, []);

  function chooseFaiseur(i, value) {
    if (value === OTHER) return setRow(i, { faiseurId: '', faiseurLibre: true, faiseur: '' });
    const f = faiseurs.find((x) => x.id === value);
    setRow(i, { faiseurId: f?.id || '', faiseurLibre: false, faiseur: f?.fullName || '' });
  }
  function pickAme(m) {
    setRow(picking, { assigneId: m.id, nomsAme: `${m.firstName} ${m.lastName}`.trim(), telephone: m.phone || '' });
    setPicking(null);
  }

  const nomInvalid = !entete.nomSuperviseur.trim();
  const enteteTelBad = phoneHasInvalid(entete.telephone);

  function setRow(i, patch) { setLignes((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))); }
  function addRow() { setLignes((rows) => [...rows, emptyRow()]); }
  function removeRow(i) { setLignes((rows) => rows.filter((_, idx) => idx !== i)); }

  async function save(status) {
    if (nomInvalid) { setShowErrors(true); setError("Le nom de l'encadreur est obligatoire."); return null; }
    setBusy(true); setError('');
    try {
      const payload = {
        type: 'superviseur',
        entete: { ...entete },
        lignes: lignes.filter((r) => (r.faiseur || '').trim() !== '' || (r.nomsAme || '').trim() !== '' || r.assigneId),
        status,
      };
      let saved;
      if (id) saved = await updateRapportHebdo(id, payload);
      else { saved = await createRapportHebdo(payload); setId(saved.id); }
      onSaved?.(saved, status);
      return saved;
    } catch (err) { setError(err?.message || 'Enregistrement impossible.'); return null; }
    finally { setBusy(false); }
  }

  async function submit() { const s = await save('soumis'); if (s) setError(''); return s; }
  async function ensureSavedId() { if (id) return id; const s = await save(initial?.status || 'brouillon'); return s?.id || null; }
  async function downloadCurrent() {
    const s = await save(initial?.status || 'brouillon');
    if (!s) return;
    try { await downloadRapportHebdoPdf(s.id, 'fiche-encadreurs'); }
    catch (e) { setError(e?.message || 'Téléchargement impossible.'); }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
          Noms &amp; prénoms de l'encadreur <span className="text-destructive-dark">*</span>
          <Input value={entete.nomSuperviseur} onChange={(e) => setEntete({ ...entete, nomSuperviseur: e.target.value })}
            className={showErrors && nomInvalid ? 'border-destructive-dark focus-visible:ring-destructive-dark' : ''} />
          {showErrors && nomInvalid && <span className="text-xs text-destructive-dark">Ce champ est obligatoire.</span>}
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Téléphone
          <Input inputMode="numeric" value={entete.telephone} onChange={(e) => setEntete({ ...entete, telephone: e.target.value })}
            className={enteteTelBad ? 'border-destructive-dark text-destructive-dark focus-visible:ring-destructive-dark' : ''} />
          {enteteTelBad && <span className="text-xs text-destructive-dark">Chiffres uniquement</span>}
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Rapport de la semaine du
          <Input type="date" value={entete.date} onChange={(e) => setEntete({ ...entete, date: e.target.value })} />
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        Pour chaque âme, choisissez son <strong>Faiseur de Disciples</strong> et, si elle est déjà connue, <strong>choisissez-la dans l'annuaire</strong>.
        À la soumission, chaque âme est ajoutée à l'annuaire (sans doublon) et rattachée au faiseur choisi.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 w-10">N°</th>
              <th className="px-3 py-2.5 min-w-[190px]">Faiseur de Disciples</th>
              <th className="px-3 py-2.5 min-w-[130px]">Téléphone (âme)</th>
              <th className="px-3 py-2.5 min-w-[220px]">Noms de l'âme</th>
              <th className="px-3 py-2.5 min-w-[180px]">Commentaires / Observations</th>
              <th className="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lignes.map((r, i) => {
              const badPhone = phoneHasInvalid(r.telephone);
              return (
                <tr key={i}>
                  <td className="px-3 py-2 text-center text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-col gap-1">
                      <select aria-label={`Faiseur de Disciples, ligne ${i + 1}`} className={SELECT}
                        value={r.faiseurId || (r.faiseurLibre || (r.faiseur && !r.faiseurId) ? OTHER : '')}
                        onChange={(e) => chooseFaiseur(i, e.target.value)}>
                        <option value="">— Choisir —</option>
                        {faiseurs.map((f) => <option key={f.id} value={f.id}>{f.fullName}</option>)}
                        <option value={OTHER}>Autre (saisir le nom)</option>
                      </select>
                      {(r.faiseurLibre || (r.faiseur && !r.faiseurId)) && (
                        <Input className="h-9" placeholder="Nom du faiseur" value={r.faiseur} onChange={(e) => setRow(i, { faiseur: e.target.value })} />
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <Input className={`h-10 ${badPhone ? 'border-destructive-dark text-destructive-dark focus-visible:ring-destructive-dark' : ''}`}
                      inputMode="tel" value={r.telephone} onChange={(e) => setRow(i, { telephone: e.target.value, assigneId: '' })} aria-invalid={badPhone} />
                    {badPhone && <span className="mt-0.5 block text-xs text-destructive-dark">Chiffres uniquement</span>}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <Input className="h-10" value={r.nomsAme} onChange={(e) => setRow(i, { nomsAme: e.target.value, assigneId: '' })} />
                      <Button type="button" variant="outline" size="icon" className="size-10 shrink-0" onClick={() => setPicking(i)}
                        aria-label={`Choisir l'âme de la ligne ${i + 1} dans l'annuaire`} title="Choisir dans l'annuaire">
                        <BookUser className="size-4" />
                      </Button>
                    </div>
                    {r.assigneId && <span className="mt-0.5 flex items-center gap-1 text-xs text-success-foreground-light"><Check className="size-3" /> Déjà dans l'annuaire</span>}
                  </td>
                  <td className="px-2 py-2"><Input className="h-10" value={r.commentaires} onChange={(e) => setRow(i, { commentaires: e.target.value })} /></td>
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
        <Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="size-4" /> Ajouter une ligne</Button>
        {!id && <ReprendreDerniereFiche type="superviseur" currentId={id} resetRow={resetRow} onApply={setLignes} />}
      </div>

      <RapportAttachments rapportId={id} ensureId={ensureSavedId} disabled={initial?.status === 'valide'} />
      <AmePicker open={picking !== null} onClose={() => setPicking(null)} onPick={pickAme} />

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={downloadCurrent} disabled={busy}>
          <Download className="size-4" /> Télécharger le PDF
        </Button>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => save('brouillon')} disabled={busy}>Enregistrer le brouillon</Button>
          <Button type="button" onClick={submit} disabled={busy}>
            <Send className="size-4" /> {busy ? 'Envoi…' : 'Soumettre le rapport'}
          </Button>
        </div>
      </div>
    </div>
  );
}
