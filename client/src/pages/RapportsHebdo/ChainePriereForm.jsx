import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Download, Send, ClipboardPaste, Copy, Check } from 'lucide-react';
import { createRapportHebdo, updateRapportHebdo, downloadRapportHebdoPdf } from '../../api/rapportsHebdo';
import ReprendreDerniereFiche from './ReprendreDerniereFiche';
import RapportAttachments from './RapportAttachments';
import Modal from '../../components/Modal';
import { CP_CATEGORIES } from './types';
import { useAuth } from '../../hooks/useAuth';
import { parseWhatsAppReport } from './chainePriere';

const TEXTAREA =
  'border-input bg-background text-foreground flex w-full rounded-lg border px-3 py-2 text-base shadow-xs outline-none resize-y focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm';
const DAYS = [
  ['lundi', 'Lun', 'Monday'], ['mardi', 'Mar', 'Tuesday'], ['mercredi', 'Mer', 'Wednesday'], ['jeudi', 'Jeu', 'Thursday'],
  ['vendredi', 'Ven', 'Friday'], ['samedi', 'Sam', 'Saturday'], ['dimanche', 'Dim', 'Sunday'],
];
// Titres des rubriques tels qu'ils apparaissent dans le rapport publié sur WhatsApp.
const WA_HEADINGS = {
  pasteurs: 'Pastors',
  leaders: 'Minister & Leaders',
  membres: 'Members',
  non_connectes: 'Pastors and leader not connected',
};

const mondayOfThisWeek = () => {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};
const emptyRow = (categorie) => ({ nom: '', categorie, presence: {}, note: '' });
// Garde la personne et sa catégorie, efface la semaine.
const resetRow = (r) => ({ nom: r.nom || '', categorie: r.categorie || 'membres', presence: {}, note: '' });

function formatShortDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : '';
}

// Rapport de la chaîne de prière (Intercession / Prière) : liste des
// intercesseurs par catégorie, présence par soir et score « x/N ».
export default function ChainePriereForm({ initial, onSaved }) {
  const { user } = useAuth();
  const e0 = initial?.entete || {};
  const [id, setId] = useState(initial?.id || null);
  const [entete, setEntete] = useState({
    tranche: e0.tranche || '23h - 00h',
    semaineDu: e0.semaineDu || mondayOfThisWeek(),
    responsable: e0.responsable || (initial ? '' : user?.fullName || ''),
    jours: Array.isArray(e0.jours) && e0.jours.length ? e0.jours : ['lundi', 'mardi', 'mercredi'],
  });
  const [lignes, setLignes] = useState(initial?.lignes?.length ? initial.lignes : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);

  const jours = DAYS.filter(([k]) => entete.jours.includes(k));
  const totals = useMemo(
    () => Object.fromEntries(jours.map(([k]) => [k, lignes.filter((r) => r.presence?.[k]).length])),
    [lignes, jours]
  );

  function toggleJour(k) {
    setEntete((s) => {
      const has = s.jours.includes(k);
      const next = has ? s.jours.filter((x) => x !== k) : DAYS.map(([d]) => d).filter((d) => d === k || s.jours.includes(d));
      return { ...s, jours: next.length ? next : s.jours };
    });
  }
  function setRow(i, patch) { setLignes((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))); }
  function togglePresence(i, k) {
    setLignes((rows) => rows.map((r, idx) => (idx === i ? { ...r, presence: { ...r.presence, [k]: !r.presence?.[k] } } : r)));
  }
  function addRow(categorie) { setLignes((rows) => [...rows, emptyRow(categorie)]); }
  function removeRow(i) { setLignes((rows) => rows.filter((_, idx) => idx !== i)); }

  function applyImport() {
    const { header, rows } = parseWhatsAppReport(importText);
    if (!rows.length) { setError('Aucun nom reconnu dans le texte collé.'); return; }
    setEntete((s) => ({ ...s, ...(header.tranche ? { tranche: header.tranche } : {}) }));
    setLignes((cur) => {
      const known = new Set(cur.map((r) => `${r.categorie}|${r.nom.trim().toLowerCase()}`));
      return [...cur.filter((r) => r.nom.trim()), ...rows.filter((r) => !known.has(`${r.categorie}|${r.nom.toLowerCase()}`))];
    });
    setImportOpen(false); setImportText(''); setError('');
  }

  function whatsappText() {
    const n = jours.length;
    const lines = [`*Rapport de la chaîne de prière ${entete.tranche}*`, '', `*La semaine du ${formatShortDate(entete.semaineDu)}*`, '',
      '*Those who prayed online*', `*${jours.map(([k, , en]) => `${en} T:${totals[k]}`).join('/ ')}*`];
    for (const [cat] of CP_CATEGORIES) {
      const list = lignes.filter((r) => r.categorie === cat && r.nom.trim());
      if (!list.length) continue;
      lines.push('', `*➡️${WA_HEADINGS[cat]}*`);
      for (const r of list) {
        const score = jours.filter(([k]) => r.presence?.[k]).length;
        lines.push(`${r.nom.trim()} (${score}/${n})${r.note ? ` ${r.note.trim()}` : ''}`);
      }
    }
    return lines.join('\n');
  }
  async function copyWhatsApp() {
    try { await navigator.clipboard.writeText(whatsappText()); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError('Copie impossible sur cet appareil.'); }
  }

  async function save(status) {
    setBusy(true); setError('');
    try {
      const payload = { type: 'chaine_priere', entete: { ...entete }, lignes: lignes.filter((r) => (r.nom || '').trim() !== ''), status };
      let saved;
      if (id) saved = await updateRapportHebdo(id, payload);
      else { saved = await createRapportHebdo(payload); setId(saved.id); }
      onSaved?.(saved, status);
      return saved;
    } catch (err) { setError(err?.message || 'Enregistrement impossible.'); return null; }
    finally { setBusy(false); }
  }
  async function ensureSavedId() { if (id) return id; const s = await save(initial?.status || 'brouillon'); return s?.id || null; }
  async function downloadCurrent() {
    const s = await save(initial?.status || 'brouillon');
    if (!s) return;
    try { await downloadRapportHebdoPdf(s.id, 'chaine-de-priere'); }
    catch (e) { setError(e?.message || 'Téléchargement impossible.'); }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Tranche horaire
          <Input value={entete.tranche} placeholder="23h - 00h" onChange={(e) => setEntete({ ...entete, tranche: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Semaine du
          <Input type="date" value={entete.semaineDu} onChange={(e) => setEntete({ ...entete, semaineDu: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Responsable
          <Input value={entete.responsable} onChange={(e) => setEntete({ ...entete, responsable: e.target.value })} />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Soirs de prière de la semaine</span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Soirs de prière">
          {DAYS.map(([k]) => (
            <button key={k} type="button" aria-pressed={entete.jours.includes(k)} onClick={() => toggleJour(k)}
              className={`min-h-[36px] rounded-lg border px-3 text-sm font-medium ${entete.jours.includes(k) ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}>
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-muted/40 px-4 py-3 text-sm">
        <span className="font-medium">Ont prié en ligne :</span>
        {jours.map(([k]) => (
          <span key={k} className="tabular-nums">{k.charAt(0).toUpperCase() + k.slice(1)} <strong>T:{totals[k]}</strong></span>
        ))}
        <span className="text-muted-foreground">· {lignes.filter((r) => r.nom.trim()).length} personne(s) sur la liste</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <ClipboardPaste className="size-4" /> Importer depuis WhatsApp
        </Button>
        {!id && <ReprendreDerniereFiche type="chaine_priere" currentId={id} resetRow={resetRow} onApply={setLignes} />}
      </div>

      {CP_CATEGORIES.map(([cat, label]) => {
        const indexes = lignes.map((r, i) => (r.categorie === cat ? i : -1)).filter((i) => i >= 0);
        return (
          <div key={cat} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-primary">{label} ({indexes.length})</h3>
            {indexes.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 w-10">N°</th>
                      <th className="px-3 py-2 min-w-[180px]">Nom</th>
                      {jours.map(([k, short]) => <th key={k} className="px-1 py-2 w-14 text-center">{short}</th>)}
                      <th className="px-2 py-2 w-16 text-center">Score</th>
                      <th className="px-3 py-2 min-w-[150px]">Note</th>
                      <th className="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {indexes.map((i, n) => {
                      const r = lignes[i];
                      const score = jours.filter(([k]) => r.presence?.[k]).length;
                      return (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-center text-muted-foreground">{n + 1}</td>
                          <td className="px-2 py-1.5"><Input className="h-9" aria-label={`Nom, ${label} ${n + 1}`} value={r.nom} onChange={(e) => setRow(i, { nom: e.target.value })} /></td>
                          {jours.map(([k, short]) => (
                            <td key={k} className="px-1 py-1.5 text-center">
                              <button type="button" onClick={() => togglePresence(i, k)} aria-pressed={!!r.presence?.[k]} aria-label={`${short} — ${r.nom || 'ligne ' + (n + 1)}`}
                                className={`size-8 rounded-md border text-sm font-bold ${r.presence?.[k] ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                                {r.presence?.[k] ? '✓' : ''}
                              </button>
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-center font-medium tabular-nums">{score}/{jours.length}</td>
                          <td className="px-2 py-1.5"><Input className="h-9" value={r.note} placeholder="ex. problème de téléphone" onChange={(e) => setRow(i, { note: e.target.value })} /></td>
                          <td className="px-2 py-1.5 text-center">
                            <button type="button" onClick={() => removeRow(i)} aria-label="Supprimer la ligne" className="text-muted-foreground hover:text-destructive-dark"><Trash2 className="size-4" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => addRow(cat)}>
              <Plus className="size-4" /> Ajouter dans « {label} »
            </Button>
          </div>
        );
      })}

      <RapportAttachments rapportId={id} ensureId={ensureSavedId} disabled={initial?.status === 'valide'} />

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={downloadCurrent} disabled={busy}><Download className="size-4" /> Télécharger le PDF</Button>
          <Button type="button" variant="outline" onClick={copyWhatsApp}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? 'Copié' : 'Copier pour WhatsApp'}
          </Button>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => save('brouillon')} disabled={busy}>Enregistrer le brouillon</Button>
          <Button type="button" onClick={() => save('soumis')} disabled={busy}><Send className="size-4" /> {busy ? 'Envoi…' : 'Soumettre le rapport'}</Button>
        </div>
      </div>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Importer depuis WhatsApp">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Collez le rapport de la chaîne de prière tel qu'il a été publié sur WhatsApp. Les noms sont rangés par catégorie
            (Pastors, Minister &amp; Leaders, Members, not connected). Les présences de la nouvelle semaine restent à cocher.
          </p>
          <textarea id="cp-import" rows={10} value={importText} onChange={(e) => setImportText(e.target.value)} className={TEXTAREA}
            placeholder={'*➡️Pastors*\nPasteur Etoundi (3/3)\n…'} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>Annuler</Button>
            <Button type="button" onClick={applyImport} disabled={!importText.trim()}>Importer les noms</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

