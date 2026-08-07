import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Download, Send } from 'lucide-react';
import { createRapportHebdo, updateRapportHebdo, downloadRapportHebdoPdf } from '../../api/rapportsHebdo';

const emptyRow = () => ({ nom: '', quartier: '', telephone: '', lecon: '', observations: '', present: null });
const phoneHasInvalid = (v) => /[^0-9\s]/.test(v || '');

// Fiche de Rapport Hebdomadaire du Faiseur de Disciples (Département du Suivi).
export default function FaiseurDisciplesForm({ initial, onSaved }) {
  const [id, setId] = useState(initial?.id || null);
  const [entete, setEntete] = useState({
    nomFaiseur: initial?.entete?.nomFaiseur || '',
    date: initial?.entete?.date || '',
  });
  const [lignes, setLignes] = useState(
    initial?.lignes?.length ? initial.lignes : [emptyRow(), emptyRow(), emptyRow()]
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const nomInvalid = !entete.nomFaiseur.trim();

  function setRow(i, patch) { setLignes((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))); }
  function addRow() { setLignes((rows) => [...rows, emptyRow()]); }
  function removeRow(i) { setLignes((rows) => rows.filter((_, idx) => idx !== i)); }

  async function save(status) {
    if (nomInvalid) { setShowErrors(true); setError('Le nom du faiseur de disciples est obligatoire.'); return null; }
    setBusy(true); setError('');
    try {
      const payload = {
        type: 'faiseur_disciples',
        entete: { ...entete },
        lignes: lignes.filter((r) => (r.nom || '').trim() !== ''),
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
  async function downloadCurrent() {
    const s = await save(initial?.status || 'brouillon');
    if (!s) return;
    try { await downloadRapportHebdoPdf(s.id, 'rapport-faiseur-disciples'); }
    catch (e) { setError(e?.message || 'Téléchargement impossible.'); }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Nom du faiseur de disciples <span className="text-destructive-dark">*</span>
          <Input
            value={entete.nomFaiseur}
            onChange={(e) => setEntete({ ...entete, nomFaiseur: e.target.value })}
            className={showErrors && nomInvalid ? 'border-destructive-dark focus-visible:ring-destructive-dark' : ''}
          />
          {showErrors && nomInvalid && <span className="text-xs text-destructive-dark">Ce champ est obligatoire.</span>}
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Rapport de la semaine du
          <Input type="date" value={entete.date} onChange={(e) => setEntete({ ...entete, date: e.target.value })} />
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 w-10">N°</th>
              <th className="px-3 py-2.5 min-w-[170px]">Noms &amp; Prénoms</th>
              <th className="px-3 py-2.5 min-w-[110px]">Quartier</th>
              <th className="px-3 py-2.5 min-w-[130px]">Téléphone</th>
              <th className="px-3 py-2.5 w-20">Leçon</th>
              <th className="px-3 py-2.5 min-w-[150px]">Observations</th>
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
                  <td className="px-2 py-2"><Input className="h-10" value={r.quartier} onChange={(e) => setRow(i, { quartier: e.target.value })} /></td>
                  <td className="px-2 py-2">
                    <Input className={`h-10 ${badPhone ? 'border-destructive-dark text-destructive-dark focus-visible:ring-destructive-dark' : ''}`}
                      inputMode="numeric" value={r.telephone} onChange={(e) => setRow(i, { telephone: e.target.value })} aria-invalid={badPhone} />
                    {badPhone && <span className="mt-0.5 block text-xs text-destructive-dark">Chiffres uniquement</span>}
                  </td>
                  <td className="px-2 py-2"><Input className="h-10" value={r.lecon} onChange={(e) => setRow(i, { lecon: e.target.value })} /></td>
                  <td className="px-2 py-2"><Input className="h-10" value={r.observations} onChange={(e) => setRow(i, { observations: e.target.value })} /></td>
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

      <div>
        <Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="size-4" /> Ajouter une ligne</Button>
      </div>

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
