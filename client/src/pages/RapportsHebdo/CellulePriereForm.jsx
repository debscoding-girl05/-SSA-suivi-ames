import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Send } from 'lucide-react';
import { createRapportHebdo, updateRapportHebdo, downloadRapportHebdoPdf } from '../../api/rapportsHebdo';
import { fetchLastRapportHebdo } from './carryForward';
import RapportAttachments from './RapportAttachments';

const phoneHasInvalid = (v) => /[^0-9\s]/.test(v || '');

// Rapport hebdomadaire de cellule de prière (questionnaire).
export default function CellulePriereForm({ initial, onSaved }) {
  const [id, setId] = useState(initial?.id || null);
  const e0 = initial?.entete || {};
  const [f, setF] = useState({
    date: e0.date || '', nomCellule: e0.nomCellule || '', leader: e0.leader || '', telephone: e0.telephone || '',
    hommes: e0.hommes ?? '', femmes: e0.femmes ?? '', adolescents: e0.adolescents ?? '', enfants: e0.enfants ?? '',
    themeDevotionnel: e0.themeDevotionnel || '', totalMembresCulte: e0.totalMembresCulte ?? '', casASignaler: e0.casASignaler || '',
    aEvangelise: e0.aEvangelise || '', nbAmes: e0.nbAmes ?? '', totalAmesCulte: e0.totalAmesCulte ?? '', raisonNon: e0.raisonNon || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Nouvelle fiche : reprend le nom de la cellule/leader/téléphone de la
  // dernière fois — ces champs ne changent presque jamais d'une semaine à
  // l'autre, inutile de les retaper.
  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    fetchLastRapportHebdo('cellule_priere').then((last) => {
      if (cancelled || !last?.entete) return;
      setF((s) => ({
        ...s,
        nomCellule: s.nomCellule || last.entete.nomCellule || '',
        leader: s.leader || last.entete.leader || '',
        telephone: s.telephone || last.entete.telephone || '',
      }));
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [showErrors, setShowErrors] = useState(false);

  const set = (patch) => setF((s) => ({ ...s, ...patch }));
  const nomCelluleInvalid = !f.nomCellule.trim();
  const leaderInvalid = !f.leader.trim();
  const telBad = phoneHasInvalid(f.telephone);

  const totalPresents = useMemo(
    () => (Number(f.hommes) || 0) + (Number(f.femmes) || 0) + (Number(f.adolescents) || 0) + (Number(f.enfants) || 0),
    [f.hommes, f.femmes, f.adolescents, f.enfants]
  );

  const numOrNull = (v) => (v === '' || v == null ? null : Number(v));

  async function save(status) {
    if (nomCelluleInvalid || leaderInvalid) {
      setShowErrors(true);
      setError('Le nom de la cellule et le leader sont obligatoires.');
      return null;
    }
    setBusy(true); setError('');
    try {
      const entete = {
        date: f.date, nomCellule: f.nomCellule, leader: f.leader, telephone: f.telephone,
        hommes: numOrNull(f.hommes), femmes: numOrNull(f.femmes), adolescents: numOrNull(f.adolescents), enfants: numOrNull(f.enfants),
        totalPresents,
        themeDevotionnel: f.themeDevotionnel, totalMembresCulte: numOrNull(f.totalMembresCulte), casASignaler: f.casASignaler,
        aEvangelise: f.aEvangelise, nbAmes: numOrNull(f.nbAmes), totalAmesCulte: numOrNull(f.totalAmesCulte), raisonNon: f.raisonNon,
      };
      const payload = { type: 'cellule_priere', entete, lignes: [], status };
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
    try { await downloadRapportHebdoPdf(s.id, 'rapport-cellule-priere'); }
    catch (err) { setError(err?.message || 'Téléchargement impossible.'); }
  }

  const numField = (label, key) => (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <Input type="number" min="0" value={f[key]} onChange={(ev) => set({ [key]: ev.target.value })} />
    </label>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* En-tête */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Date
          <Input type="date" value={f.date} onChange={(ev) => set({ date: ev.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Nom de la cellule <span className="text-destructive-dark">*</span>
          <Input value={f.nomCellule} onChange={(ev) => set({ nomCellule: ev.target.value })}
            className={showErrors && nomCelluleInvalid ? 'border-destructive-dark focus-visible:ring-destructive-dark' : ''} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Leader <span className="text-destructive-dark">*</span>
          <Input value={f.leader} onChange={(ev) => set({ leader: ev.target.value })}
            className={showErrors && leaderInvalid ? 'border-destructive-dark focus-visible:ring-destructive-dark' : ''} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Téléphone
          <Input inputMode="numeric" value={f.telephone} onChange={(ev) => set({ telephone: ev.target.value })}
            className={telBad ? 'border-destructive-dark text-destructive-dark focus-visible:ring-destructive-dark' : ''} />
          {telBad && <span className="text-xs text-destructive-dark">Chiffres uniquement</span>}
        </label>
      </div>

      {/* Section I */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">I — Assiduité aux réunions</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {numField('Hommes présents', 'hommes')}
          {numField('Femmes présentes', 'femmes')}
          {numField('Adolescents (10-19)', 'adolescents')}
          {numField('Enfants (0-9)', 'enfants')}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 text-sm font-medium">
            Total des personnes présentes
            <div className="flex h-10 items-center rounded-md border border-border bg-muted/40 px-3 text-base font-semibold">
              {totalPresents}<span className="ml-2 text-xs font-normal text-muted-foreground">calculé automatiquement</span>
            </div>
          </div>
          {numField('Membres présents au culte du dimanche', 'totalMembresCulte')}
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Dévotionnel : thème du jour
          <Input value={f.themeDevotionnel} onChange={(ev) => set({ themeDevotionnel: ev.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Cas à signaler
          <textarea rows={2} value={f.casASignaler} onChange={(ev) => set({ casASignaler: ev.target.value })}
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm" />
        </label>
      </div>

      {/* Section II */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">II — Évangélisation</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5 text-sm font-medium">
            Avez-vous évangélisé cette semaine ?
            <div className="flex gap-2">
              {['Oui', 'Non'].map((opt) => (
                <button key={opt} type="button" onClick={() => set({ aEvangelise: opt })}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${f.aEvangelise === opt ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>{opt}</button>
              ))}
            </div>
          </div>
          {numField("Nombre d'âmes évangélisées", 'nbAmes')}
          {numField('Âmes présentes au culte du dimanche', 'totalAmesCulte')}
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Si non, pourquoi n'avez-vous pas évangélisé ?
          <textarea rows={2} value={f.raisonNon} onChange={(ev) => set({ raisonNon: ev.target.value })}
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm" />
        </label>
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
