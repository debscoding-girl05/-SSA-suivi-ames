import { Fragment, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Download, Send } from 'lucide-react';
import { createRapportHebdo, updateRapportHebdo, downloadRapportHebdoPdf } from '../../api/rapportsHebdo';
import ReprendreDerniereFiche from './ReprendreDerniereFiche';
import RapportAttachments from './RapportAttachments';
import { fetchOwnAssignes } from './carryForward';
import { useAuth } from '../../hooks/useAuth';

// Colonnes, ordre et libellés de la fiche papier officielle.
const DAYS = [
  ['lundi', 'Lundi'], ['mardi', 'Mardi'], ['mercredi', 'Mercredi'], ['jeudi', 'Jeudi'],
  ['vendredi', 'Vendredi'], ['samedi', 'Samedi'], ['dimanche', 'Dimanche'],
];
const PRES = [
  ['mardi', 'Mardi'], ['jeudi', 'Jeudi'],
  ['vendredi', 'Vendredi (nuit de solutions ou nuit de prière des ouvriers)'], ['dimanche', 'Dimanche'],
];
// Chiffres, espaces et « + » initial, plus une précision entre parenthèses —
// ex. « +237 690 60 77 13 (parent) ».
const phoneHasInvalid = (v) => /[^0-9\s]/.test(String(v || '').replace(/\([^)]*\)/g, '').replace(/^\s*\+/, ''));
// En-têtes gris / noir alternés comme sur la fiche imprimée.
const GREY = '#595959';
const BLACK = '#161616';
const headBg = (i) => ({ backgroundColor: i % 2 === 0 ? GREY : BLACK, color: '#fff' });
const HEAD = { backgroundColor: GREY, color: '#fff' };
const BAND = { backgroundColor: '#3f3f3f', color: '#fff' };

const emptyRow = () => ({
  membre: '', telephone: '',
  croissance: Object.fromEntries(DAYS.map(([d]) => [d, { bible: false, livret: false }])),
  presence: Object.fromEntries(PRES.map(([d]) => [d, false])),
  remarques: '',
});
// Garde le membre + son téléphone, remet à zéro la semaine (croissance/présence/remarques).
const resetRow = (r) => ({
  membre: r.membre || '', telephone: r.telephone || '',
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
  const { user } = useAuth();
  const [id, setId] = useState(initial?.id || null);
  const [entete, setEntete] = useState({
    encadreur: initial?.entete?.encadreur || (initial ? '' : user?.fullName || ''),
    groupe: initial?.entete?.groupe || '',
    date: initial?.entete?.date || '',
  });
  const [lignes, setLignes] = useState(initial?.lignes?.length ? initial.lignes : [emptyRow(), emptyRow()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  // Nouvelle fiche : pré-remplit avec les choristes actuellement assignés.
  useEffect(() => {
    if (initial || !user?.id) return;
    let cancelled = false;
    fetchOwnAssignes(user.id).then((assignes) => {
      if (cancelled || !assignes.length) return;
      const roster = assignes.map((a) => resetRow({ membre: `${a.firstName} ${a.lastName}`.trim(), telephone: a.phone || '' }));
      setLignes((current) => (current.every((r) => !(r.membre || '').trim()) ? roster : current));
    });
    return () => { cancelled = true; };
  }, [initial, user?.id]);

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
  async function ensureSavedId() { if (id) return id; const s = await save(initial?.status || 'brouillon'); return s?.id || null; }
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
          <span>Encadreur <span className="text-destructive-dark">*</span></span>
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
          <thead className="text-xs">
            <tr>
              <th rowSpan={3} style={HEAD} className="px-2 py-1.5 sticky left-0 border border-black">N°</th>
              <th rowSpan={3} style={HEAD} className="px-2 py-1.5 min-w-[140px] border border-black">Membres</th>
              <th rowSpan={3} style={HEAD} className="px-2 py-1.5 min-w-[120px] border border-black">Téléphone</th>
              <th colSpan={DAYS.length * 2} style={BAND} className="px-2 py-1 text-center font-bold uppercase tracking-wide border border-black">Croissance spirituelle</th>
              <th rowSpan={3} aria-hidden className="w-2 bg-black p-0" />
              <th colSpan={PRES.length} style={BAND} className="px-2 py-1 text-center font-bold uppercase tracking-wide border border-black">Présence à l'église</th>
              <th rowSpan={3} style={HEAD} className="px-2 py-1.5 min-w-[130px] border border-black">Remarques</th>
              <th rowSpan={3} className="px-2 py-1.5"></th>
            </tr>
            <tr>
              {DAYS.map(([d, lbl], i) => (
                <th key={d} colSpan={2} style={headBg(i)} className="px-1 py-1 text-center font-bold border border-black">{lbl}</th>
              ))}
              {PRES.map(([d, lbl], i) => (
                <th key={d} rowSpan={2} style={headBg(i)} className={`px-1 py-1 text-center font-semibold border border-black ${d === 'vendredi' ? 'min-w-[120px] text-[10px] leading-tight' : ''}`}>{lbl}</th>
              ))}
            </tr>
            <tr>
              {DAYS.map(([d], i) => (
                <Fragment key={d}>
                  <th style={headBg(i)} className="px-1 py-0.5 text-center text-[10px] border border-black">Bible</th>
                  <th style={headBg(i)} className="px-1 py-0.5 text-center text-[10px] border border-black">Livret</th>
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
                      <td className="px-0.5 py-1.5 border-l border-border text-center">
                        <Toggle on={!!r.croissance[d]?.bible} onClick={() => toggleCroissance(i, d, 'bible')} title={`Bible — ${DAYS[di][1]}`} />
                      </td>
                      <td className="px-0.5 py-1.5 text-center">
                        <Toggle on={!!r.croissance[d]?.livret} onClick={() => toggleCroissance(i, d, 'livret')} title="Livret" />
                      </td>
                    </Fragment>
                  ))}
                  <td aria-hidden className="bg-black p-0" />
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

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="size-4" /> Ajouter un membre</Button>
        {!id && <ReprendreDerniereFiche type="choristes" currentId={id} resetRow={resetRow} onApply={setLignes} />}
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
