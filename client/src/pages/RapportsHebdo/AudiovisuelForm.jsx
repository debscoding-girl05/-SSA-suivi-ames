import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Download, Send } from 'lucide-react';
import { createRapportHebdo, updateRapportHebdo, downloadRapportHebdoPdf } from '../../api/rapportsHebdo';
import ReprendreDerniereFiche from './ReprendreDerniereFiche';
import RapportAttachments from './RapportAttachments';
import { fetchOwnAssignes } from './carryForward';
import { useAuth } from '../../hooks/useAuth';

const LEGENDE = ['', 'P', 'R', 'A', 'E', 'M'];
const phoneHasInvalid = (v) => /[^0-9\s]/.test(v || '');

const emptyRow = () => ({
  nom: '', telephone: '',
  m: '', j: '', nuitsPrieres: '', progSpecial: '', dim: '',
  cpSamedi: '', devo: '', service: '', xtere: '',
});
// Garde l'ouvrier + son téléphone, remet à zéro l'assiduité de la semaine.
const resetRow = (r) => ({
  nom: r.nom || '', telephone: r.telephone || '',
  m: '', j: '', nuitsPrieres: '', progSpecial: '', dim: '',
  cpSamedi: '', devo: '', service: '', xtere: '',
});

// Rapport d'assiduité des ouvriers (Audiovisuel).
export default function AudiovisuelForm({ initial, onSaved }) {
  const { user } = useAuth();
  const [id, setId] = useState(initial?.id || null);
  const [entete, setEntete] = useState({
    mois: initial?.entete?.mois || '',
    semaineDu: initial?.entete?.semaineDu || '',
    semaineAu: initial?.entete?.semaineAu || '',
    encadreur: initial?.entete?.encadreur || '',
    nombreMembres: initial?.entete?.nombreMembres ?? '',
    remarquesParticulieres: initial?.entete?.remarquesParticulieres || '',
  });
  const [lignes, setLignes] = useState(initial?.lignes?.length ? initial.lignes : [emptyRow(), emptyRow(), emptyRow()]);
  const [busy, setBusy] = useState(false);

  // Nouvelle fiche : pré-remplit avec les ouvriers actuellement assignés.
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
  const [error, setError] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const encadreurInvalid = !entete.encadreur.trim();

  function setRow(i, patch) { setLignes((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))); }
  function addRow() { setLignes((rows) => [...rows, emptyRow()]); }
  function removeRow(i) { setLignes((rows) => rows.filter((_, idx) => idx !== i)); }

  async function save(status) {
    if (encadreurInvalid) { setShowErrors(true); setError("Le nom de l'encadreur est obligatoire."); return null; }
    setBusy(true); setError('');
    try {
      const payload = {
        type: 'audiovisuel',
        entete: { ...entete, nombreMembres: entete.nombreMembres === '' ? null : Number(entete.nombreMembres) },
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
  async function ensureSavedId() { if (id) return id; const s = await save(initial?.status || 'brouillon'); return s?.id || null; }
  async function downloadCurrent() {
    const s = await save(initial?.status || 'brouillon');
    if (!s) return;
    try { await downloadRapportHebdoPdf(s.id, 'rapport-assiduite-ouvriers'); }
    catch (e) { setError(e?.message || 'Téléchargement impossible.'); }
  }

  const AttSelect = ({ i, k }) => (
    <select value={lignes[i][k]} onChange={(e) => setRow(i, { [k]: e.target.value })}
      className="h-9 w-full rounded-md border border-border bg-transparent px-1 text-center text-sm">
      {LEGENDE.map((o) => <option key={o} value={o}>{o || '—'}</option>)}
    </select>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* En-tête */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Nom de l'encadreur <span className="text-destructive-dark">*</span>
          <Input value={entete.encadreur} onChange={(e) => setEntete({ ...entete, encadreur: e.target.value })}
            className={showErrors && encadreurInvalid ? 'border-destructive-dark focus-visible:ring-destructive-dark' : ''} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Mois
          <Input placeholder="Juin 2026" value={entete.mois} onChange={(e) => setEntete({ ...entete, mois: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Nombre de membres sous le leadership
          <Input type="number" min="0" value={entete.nombreMembres} onChange={(e) => setEntete({ ...entete, nombreMembres: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Semaine — du
          <Input type="date" value={entete.semaineDu} onChange={(e) => setEntete({ ...entete, semaineDu: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Semaine — au
          <Input type="date" value={entete.semaineAu} onChange={(e) => setEntete({ ...entete, semaineAu: e.target.value })} />
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        Présence (M, J, Nuits de prières, Prog. Spécial, Dim.) : <strong>P</strong> Présent · <strong>R</strong> Retard · <strong>A</strong> Absent · <strong>E</strong> Excusé · <strong>M</strong> Mission spéciale.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 w-8">N°</th>
              <th className="px-2 py-1.5 min-w-[140px] text-left">Nom des ouvriers</th>
              <th className="px-2 py-1.5 min-w-[110px] text-left">Téléphone</th>
              <th className="px-1 py-1.5 w-14">M</th>
              <th className="px-1 py-1.5 w-14">J</th>
              <th className="px-1 py-1.5 w-20">Nuits de prières</th>
              <th className="px-1 py-1.5 w-20">Prog. Spécial</th>
              <th className="px-1 py-1.5 w-14">Dim.</th>
              <th className="px-1 py-1.5 w-24">C.P & Samedi</th>
              <th className="px-1 py-1.5 w-20">Devo</th>
              <th className="px-1 py-1.5 w-24">Service</th>
              <th className="px-1 py-1.5 w-24">Xtère</th>
              <th className="px-1 py-1.5 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lignes.map((r, i) => {
              const badPhone = phoneHasInvalid(r.telephone);
              return (
                <tr key={i}>
                  <td className="px-2 py-1.5 text-center text-muted-foreground">{i + 1}</td>
                  <td className="px-1 py-1.5"><Input className="h-9" value={r.nom} onChange={(e) => setRow(i, { nom: e.target.value })} /></td>
                  <td className="px-1 py-1.5">
                    <Input className={`h-9 ${badPhone ? 'border-destructive-dark text-destructive-dark' : ''}`} inputMode="numeric"
                      value={r.telephone} onChange={(e) => setRow(i, { telephone: e.target.value })} />
                  </td>
                  <td className="px-1 py-1.5"><AttSelect i={i} k="m" /></td>
                  <td className="px-1 py-1.5"><AttSelect i={i} k="j" /></td>
                  <td className="px-1 py-1.5"><AttSelect i={i} k="nuitsPrieres" /></td>
                  <td className="px-1 py-1.5"><AttSelect i={i} k="progSpecial" /></td>
                  <td className="px-1 py-1.5"><AttSelect i={i} k="dim" /></td>
                  <td className="px-1 py-1.5"><Input className="h-9" placeholder="7/7" value={r.cpSamedi} onChange={(e) => setRow(i, { cpSamedi: e.target.value })} /></td>
                  <td className="px-1 py-1.5"><Input className="h-9" placeholder="6/6" value={r.devo} onChange={(e) => setRow(i, { devo: e.target.value })} /></td>
                  <td className="px-1 py-1.5"><Input className="h-9" placeholder="Assidu…" value={r.service} onChange={(e) => setRow(i, { service: e.target.value })} /></td>
                  <td className="px-1 py-1.5"><Input className="h-9" placeholder="Discipline…" value={r.xtere} onChange={(e) => setRow(i, { xtere: e.target.value })} /></td>
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
        <Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="size-4" /> Ajouter un ouvrier</Button>
        {!id && <ReprendreDerniereFiche type="audiovisuel" currentId={id} resetRow={resetRow} onApply={setLignes} />}
      </div>

      <RapportAttachments rapportId={id} ensureId={ensureSavedId} disabled={initial?.status === 'valide'} />

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Remarque particulière concernant certains cas
        <textarea rows={3} value={entete.remarquesParticulieres} onChange={(e) => setEntete({ ...entete, remarquesParticulieres: e.target.value })}
          className="rounded-md border border-border bg-transparent px-3 py-2 text-sm" />
      </label>

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
