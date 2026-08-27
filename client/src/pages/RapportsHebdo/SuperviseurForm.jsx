import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Download, Send } from 'lucide-react';
import { createRapportHebdo, updateRapportHebdo, downloadRapportHebdoPdf } from '../../api/rapportsHebdo';
import ReprendreDerniereFiche from './ReprendreDerniereFiche';
import RapportAttachments from './RapportAttachments';

const emptyRow = () => ({ faiseur: '', telephone: '', nomsAme: '', commentaires: '' });
const resetRow = (r) => ({ faiseur: r.faiseur || '', telephone: r.telephone || '', nomsAme: r.nomsAme || '', commentaires: '' });
const phoneHasInvalid = (v) => /[^0-9\s]/.test(v || '');

// Fiche des Superviseurs (Département du Suivi).
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

  const nomInvalid = !entete.nomSuperviseur.trim();
  const enteteTelBad = phoneHasInvalid(entete.telephone);

  function setRow(i, patch) { setLignes((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))); }
  function addRow() { setLignes((rows) => [...rows, emptyRow()]); }
  function removeRow(i) { setLignes((rows) => rows.filter((_, idx) => idx !== i)); }

  async function save(status) {
    if (nomInvalid) { setShowErrors(true); setError('Le nom du superviseur est obligatoire.'); return null; }
    setBusy(true); setError('');
    try {
      const payload = {
        type: 'superviseur',
        entete: { ...entete },
        lignes: lignes.filter((r) => (r.faiseur || '').trim() !== '' || (r.nomsAme || '').trim() !== ''),
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
    try { await downloadRapportHebdoPdf(s.id, 'fiche-superviseurs'); }
    catch (e) { setError(e?.message || 'Téléchargement impossible.'); }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
          Noms &amp; prénoms du superviseur <span className="text-destructive-dark">*</span>
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

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 w-10">N°</th>
              <th className="px-3 py-2.5 min-w-[160px]">Faiseur de Disciples</th>
              <th className="px-3 py-2.5 min-w-[130px]">Téléphone (âme)</th>
              <th className="px-3 py-2.5 min-w-[150px]">Noms de l'âme</th>
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
                  <td className="px-2 py-2"><Input className="h-10" value={r.faiseur} onChange={(e) => setRow(i, { faiseur: e.target.value })} /></td>
                  <td className="px-2 py-2">
                    <Input className={`h-10 ${badPhone ? 'border-destructive-dark text-destructive-dark focus-visible:ring-destructive-dark' : ''}`}
                      inputMode="numeric" value={r.telephone} onChange={(e) => setRow(i, { telephone: e.target.value })} aria-invalid={badPhone} />
                    {badPhone && <span className="mt-0.5 block text-xs text-destructive-dark">Chiffres uniquement</span>}
                  </td>
                  <td className="px-2 py-2"><Input className="h-10" value={r.nomsAme} onChange={(e) => setRow(i, { nomsAme: e.target.value })} /></td>
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
