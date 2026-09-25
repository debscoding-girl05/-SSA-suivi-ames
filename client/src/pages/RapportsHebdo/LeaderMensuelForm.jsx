import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Download, Send } from 'lucide-react';
import { createRapportHebdo, updateRapportHebdo, downloadRapportHebdoPdf } from '../../api/rapportsHebdo';
import { getEquipe } from '../../api/dirigeants';
import RapportAttachments from './RapportAttachments';
import { useAuth } from '../../hooks/useAuth';

const TEXTAREA =
  'border-input bg-background text-foreground flex w-full rounded-lg border px-3 py-2 text-base shadow-xs outline-none resize-y focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm';

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const emptyRow = () => ({ encadreur: '', nbMembres: '', fichesRemises: '', observations: '' });

// Rapport mensuel que chaque leader remet au Pasteur. En-tête et effectifs
// pré-remplis depuis son équipe (encadreurs + membres) ; le leader complète
// le bilan. Structure provisoire, à aligner sur la fiche papier officielle.
export default function LeaderMensuelForm({ initial, onSaved }) {
  const { user } = useAuth();
  const e0 = initial?.entete || {};
  const [id, setId] = useState(initial?.id || null);
  const [entete, setEntete] = useState({
    mois: e0.mois || thisMonth(),
    departement: e0.departement || user?.departmentName || '',
    nomLeader: e0.nomLeader || user?.fullName || '',
    telephone: e0.telephone || user?.phone || '',
    effectifMembres: e0.effectifMembres ?? '',
    effectifEncadreurs: e0.effectifEncadreurs ?? '',
    presenceMoyenne: e0.presenceMoyenne ?? '',
    nouveauxVenus: e0.nouveauxVenus ?? '',
    activites: e0.activites || '',
    difficultes: e0.difficultes || '',
    besoins: e0.besoins || '',
    projets: e0.projets || '',
  });
  const [lignes, setLignes] = useState(initial?.lignes?.length ? initial.lignes : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Nouvelle fiche : effectifs et liste des encadreurs repris de l'équipe.
  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    getEquipe().then((eq) => {
      if (cancelled) return;
      setEntete((s) => ({
        ...s,
        effectifMembres: s.effectifMembres === '' ? eq.membresTotal : s.effectifMembres,
        effectifEncadreurs: s.effectifEncadreurs === '' ? eq.encadreurs.length : s.effectifEncadreurs,
      }));
      setLignes((cur) => (cur.length ? cur : eq.encadreurs.map((e) => ({ ...emptyRow(), encadreur: e.fullName, nbMembres: e.assigneCount }))));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [initial]);

  const set = (k) => (e) => setEntete((s) => ({ ...s, [k]: e.target.value }));
  function setRow(i, patch) { setLignes((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))); }

  async function save(status) {
    setBusy(true); setError('');
    try {
      const payload = {
        type: 'leader_mensuel',
        entete: { ...entete },
        lignes: lignes.filter((r) => (r.encadreur || '').trim() !== ''),
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

  async function ensureSavedId() { if (id) return id; const s = await save(initial?.status || 'brouillon'); return s?.id || null; }
  async function downloadCurrent() {
    const s = await save(initial?.status || 'brouillon');
    if (!s) return;
    try { await downloadRapportHebdoPdf(s.id, 'rapport-mensuel'); }
    catch (e) { setError(e?.message || 'Téléchargement impossible.'); }
  }

  const field = (label, key, props = {}) => (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <Input value={entete[key]} onChange={set(key)} {...props} />
    </label>
  );
  const area = (label, key) => (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <textarea rows={3} value={entete[key]} onChange={set(key)} className={TEXTAREA} />
    </label>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field('Mois', 'mois', { type: 'month' })}
        {field('Département', 'departement')}
        {field('Nom du leader', 'nomLeader')}
        {field('Téléphone', 'telephone', { inputMode: 'tel' })}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">I — Effectifs du mois</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {field('Membres suivis', 'effectifMembres', { type: 'number', min: 0 })}
          {field('Encadreurs', 'effectifEncadreurs', { type: 'number', min: 0 })}
          {field('Présence moyenne', 'presenceMoyenne', { type: 'number', min: 0 })}
          {field('Nouveaux venus', 'nouveauxVenus', { type: 'number', min: 0 })}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">II — Suivi des encadreurs</h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 w-10">N°</th>
                <th className="px-3 py-2.5 min-w-[160px]">Encadreur</th>
                <th className="px-3 py-2.5 w-24">Membres</th>
                <th className="px-3 py-2.5 w-28">Fiches remises</th>
                <th className="px-3 py-2.5 min-w-[180px]">Observations</th>
                <th className="px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lignes.map((r, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-center text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-2"><Input className="h-10" value={r.encadreur} onChange={(e) => setRow(i, { encadreur: e.target.value })} /></td>
                  <td className="px-2 py-2"><Input className="h-10" type="number" min="0" value={r.nbMembres} onChange={(e) => setRow(i, { nbMembres: e.target.value })} /></td>
                  <td className="px-2 py-2"><Input className="h-10" type="number" min="0" max="5" placeholder="/4" value={r.fichesRemises} onChange={(e) => setRow(i, { fichesRemises: e.target.value })} /></td>
                  <td className="px-2 py-2"><Input className="h-10" value={r.observations} onChange={(e) => setRow(i, { observations: e.target.value })} /></td>
                  <td className="px-2 py-2 text-center">
                    <button type="button" onClick={() => setLignes((rows) => rows.filter((_, idx) => idx !== i))} aria-label="Supprimer la ligne" className="text-muted-foreground hover:text-destructive-dark">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {lignes.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-5 text-center text-muted-foreground">Aucun encadreur rattaché.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setLignes((rows) => [...rows, emptyRow()])}>
          <Plus className="size-4" /> Ajouter une ligne
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">III — Bilan du mois</h3>
        {area('Activités réalisées', 'activites')}
        {area('Difficultés rencontrées', 'difficultes')}
        {area('Besoins / sujets de prière', 'besoins')}
        {area('Projets pour le mois prochain', 'projets')}
      </div>

      <RapportAttachments rapportId={id} ensureId={ensureSavedId} disabled={initial?.status === 'valide'} />

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={downloadCurrent} disabled={busy}>
          <Download className="size-4" /> Télécharger le PDF
        </Button>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => save('brouillon')} disabled={busy}>Enregistrer le brouillon</Button>
          <Button type="button" onClick={() => save('soumis')} disabled={busy}>
            <Send className="size-4" /> {busy ? 'Envoi…' : 'Remettre au Pasteur'}
          </Button>
        </div>
      </div>
    </div>
  );
}
