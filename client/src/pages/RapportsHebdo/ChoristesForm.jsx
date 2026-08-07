import { Fragment, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Download, Send } from 'lucide-react';
import { createRapportHebdo, updateRapportHebdo, downloadRapportHebdoPdf } from '../../api/rapportsHebdo';

const DAYS = [
  ['lundi', 'Lun'], ['mardi', 'Mar'], ['mercredi', 'Mer'], ['jeudi', 'Jeu'],
  ['vendredi', 'Ven'], ['samedi', 'Sam'], ['dimanche', 'Dim'],
];
const PRES = [
  ['mardi', 'Mardi'], ['jeudi', 'Jeudi'], ['dimanche', 'Dim.'], ['vendredi', 'Ven. (nuit)'],
];
const phoneHasInvalid = (v) => /[^0-9\s]/.test(v || '');
const dayBg = (i) => ({ backgroundColor: i % 2 === 0 ? '#efedfb' : '#d7d1f4' });

const emptyRow = () => ({
  membre: '', telephone: '',
  croissance: Object.fromEntries(DAYS.map(([d]) => [d, { bible: false, livret: false }])),
  presence: Object.fromEntries(PRES.map(([d]) => [d, false])),
  remarques: '',
});

// Petite case à cocher cliquable.
function Toggle({ on, onClick, title }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={`size-6 rounded border text-xs font-bold ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-transparent text-muted-foreground hover:bg-muted'}`}>
      {on ? '✓' : ''}
    </button>
  );
}

// Fiche de suivi hebdomadaire des choristes (Chorale).
export default function ChoristesForm({ initial, onSaved }) {
  const [id, setId] = useState(initial?.id || null);
  const [entete, setEntete] = useState({
    encadreur: initial?.entete?.encadreur || '',
    groupe: initial?.entete?.groupe || '',
    date: initial?.entete?.date || '',
  });
  const [lignes, setLignes] = useState(initial?.lignes?.length ? initial.lignes : [emptyRow(), emptyRow()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const encadreurInvalid = !entete.encadreur.trim();

  function setRow(i, patch) { setLignes((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))); }
  function toggleCroissance(i, day, kind) {
    setLignes((rows) => rows.map((r, idx) => {
      if (idx !== i) return r;
      const cr = { ...r.croissance, [day]: { ...r.croissance[day], [kind]: !r.croissance[day]?.[kind] } };
      return { ...r, croissance: cr };
    }));
  }
  function togglePresence(i, day) {
    setLignes((rows) => rows.map((r, idx) => (idx === i ? { ...r, presence: { ...r.presence, [day]: !r.presence?.[day] } } : r)));
  }
  function addRow() { setLignes((rows) => [...rows, emptyRow()]); }
  function removeRow(i) { setLignes((rows) => rows.filter((_, idx) => idx !== i)); }

  async function save(status) {
    if (encadreurInvalid) { setShowErrors(true); setError("Le nom de l'encadreur est obligatoire."); return null; }
    setBusy(true); setError('');
    try {
      const payload = { type: 'choristes', entete: { ...entete }, lignes: lignes.filter((r) => (r.membre || '').trim() !== ''), status };
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
    try { await downloadRapportHebdoPdf(s.id, 'fiche-choristes'); }
    catch (e) { setError(e?.message || 'Téléchargement impossible.'); }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Encadreur <span className="text-destructive-dark">*</span>
          <Input value={entete.encadreur} onChange={(e) => setEntete({ ...entete, encadreur: e.target.value })}
            className={showErrors && encadreurInvalid ? 'border-destructive-dark focus-visible:ring-destructive-dark' : ''} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Groupe de croissance
          <Input value={entete.groupe} onChange={(e) => setEntete({ ...entete, groupe: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Semaine du
          <Input type="date" value={entete.date} onChange={(e) => setEntete({ ...entete, date: e.target.value })} />
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        Croissance spirituelle : pour chaque jour, cochez <strong>Bible</strong> (case de gauche) et/ou <strong>Livret</strong> (case de droite). Présence à l'église : cochez les jours présents.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th rowSpan={3} className="px-2 py-1.5 sticky left-0 bg-muted/40">N°</th>
              <th rowSpan={3} className="px-2 py-1.5 min-w-[130px] text-left">Membres</th>
              <th rowSpan={3} className="px-2 py-1.5 min-w-[110px] text-left">Téléphone</th>
              <th colSpan={DAYS.length * 2} className="px-2 py-1 text-center uppercase tracking-wide">Croissance spirituelle</th>
              <th colSpan={PRES.length} className="px-2 py-1 text-center uppercase tracking-wide">Présence à l'église</th>
              <th rowSpan={3} className="px-2 py-1.5 min-w-[120px] text-left">Remarques</th>
              <th rowSpan={3} className="px-2 py-1.5"></th>
            </tr>
            <tr>
              {DAYS.map(([d, lbl], i) => (
                <th key={d} colSpan={2} style={dayBg(i)} className="px-1 py-1 text-center border-l border-border font-semibold text-foreground">{lbl}</th>
              ))}
              {PRES.map(([d, lbl]) => (
                <th key={d} rowSpan={2} className="px-1 py-1 text-center border-l border-border">{lbl}</th>
              ))}
            </tr>
            <tr>
              {DAYS.map(([d], i) => (
                <Fragment key={d}>
                  <th style={dayBg(i)} className="px-1 py-0.5 text-center border-l border-border">Bible</th>
                  <th style={dayBg(i)} className="px-1 py-0.5 text-center">Livret</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lignes.map((r, i) => {
              const badPhone = phoneHasInvalid(r.telephone);
              return (
                <tr key={i}>
                  <td className="px-2 py-1.5 text-center text-muted-foreground sticky left-0 bg-card">{i + 1}</td>
                  <td className="px-1 py-1.5"><Input className="h-9" value={r.membre} onChange={(e) => setRow(i, { membre: e.target.value })} /></td>
                  <td className="px-1 py-1.5">
                    <Input className={`h-9 ${badPhone ? 'border-destructive-dark text-destructive-dark' : ''}`} inputMode="numeric"
                      value={r.telephone} onChange={(e) => setRow(i, { telephone: e.target.value })} />
                  </td>
                  {DAYS.map(([d], di) => (
                    <Fragment key={d}>
                      <td style={dayBg(di)} className="px-0.5 py-1.5 border-l border-border text-center">
                        <Toggle on={!!r.croissance[d]?.bible} onClick={() => toggleCroissance(i, d, 'bible')} title="Bible" />
                      </td>
                      <td style={dayBg(di)} className="px-0.5 py-1.5 text-center">
                        <Toggle on={!!r.croissance[d]?.livret} onClick={() => toggleCroissance(i, d, 'livret')} title="Livret" />
                      </td>
                    </Fragment>
                  ))}
                  {PRES.map(([d]) => (
                    <td key={d} className="px-1 py-1.5 border-l border-border text-center">
                      <Toggle on={!!r.presence?.[d]} onClick={() => togglePresence(i, d)} title="Présent" />
                    </td>
                  ))}
                  <td className="px-1 py-1.5"><Input className="h-9" value={r.remarques} onChange={(e) => setRow(i, { remarques: e.target.value })} /></td>
                  <td className="px-1 py-1.5 text-center">
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
        <Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="size-4" /> Ajouter un membre</Button>
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
