import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Target, Pencil, CalendarRange } from 'lucide-react';
import ProgressRing from '../../components/ProgressRing';
import { getObjectif, setObjectif } from '../../api/objectif';

const fmtDate = (s) => (s ? new Date(`${s}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const fmtMonth = (k) => {
  const [y, m] = k.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
};

// Ajouts à l'annuaire par mois sur la période — une seule série, barres
// fines ancrées en bas, valeur au survol (title) et en clair sous la barre
// la plus haute seulement.
function MonthlyBars({ monthly }) {
  const max = Math.max(1, ...monthly.map((m) => m.count));
  const peak = monthly.reduce((best, m) => (m.count > (best?.count ?? -1) ? m : best), null);
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-muted-foreground">Personnes ajoutées par mois</p>
      <div className="mt-2 flex h-20 items-end gap-0.5" role="img" aria-label={monthly.map((m) => `${fmtMonth(m.month)} : ${m.count}`).join(', ')}>
        {monthly.map((m) => (
          <div key={m.month} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${fmtMonth(m.month)} : ${m.count} personne${m.count > 1 ? 's' : ''}`}>
            {m === peak && m.count > 0 && <span className="mb-0.5 text-[10px] font-medium tabular-nums text-foreground">{m.count}</span>}
            <div
              className="w-full max-w-6 rounded-t bg-primary transition-opacity group-hover:opacity-80"
              style={{ height: m.count ? `${Math.max(4, (m.count / max) * 100)}%` : '2px', opacity: m.count ? 1 : 0.25 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-0.5">
        {monthly.map((m) => (
          <span key={m.month} className="min-w-0 flex-1 truncate text-center text-[10px] text-muted-foreground">{fmtMonth(m.month)}</span>
        ))}
      </div>
    </div>
  );
}

// Objectif d'évangélisation — visible & modifiable par le Pasteur uniquement.
// Progression = personnes ajoutées à l'annuaire entre la date de début et la
// date de fin (sans période : tout l'annuaire).
export default function ObjectifCard() {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ target: '', debut: '', fin: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let on = true;
    getObjectif().then((d) => { if (on) setData(d); }).catch(() => {});
    return () => { on = false; };
  }, []);

  function startEdit() {
    setForm({ target: String(data.target || ''), debut: data.debut || '', fin: data.fin || '' });
    setError('');
    setEditing(true);
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      const d = await setObjectif({ target: Number(form.target) || 0, debut: form.debut, fin: form.fin });
      setData(d);
      setEditing(false);
    } catch (err) {
      setError(err?.message || 'Enregistrement impossible.');
    } finally { setBusy(false); }
  }

  if (!data) return null;
  const t = data.timeline;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Target className="size-3.5" /> Objectif d'évangélisation
          </p>
          {!editing && (
            <>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {data.achieved}<span className="text-xl text-muted-foreground">/{data.target || '—'}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {data.debut && data.fin ? `personnes ajoutées à l'annuaire du ${fmtDate(data.debut)} au ${fmtDate(data.fin)}` : "personnes dans l'annuaire (aucune période fixée)"}
              </p>
              <button type="button" onClick={startEdit} className="mt-1 inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-primary hover:underline">
                <Pencil className="size-3" /> Modifier l'objectif
              </button>
            </>
          )}
        </div>
        {!editing && <ProgressRing value={data.achieved} total={data.target} label="atteint" size={104} />}
      </div>

      {editing && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Nombre de personnes à atteindre
              <Input type="number" min="0" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} autoFocus />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Date de début
              <Input type="date" value={form.debut} onChange={(e) => setForm((f) => ({ ...f, debut: e.target.value }))} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Date de fin
              <Input type="date" value={form.fin} min={form.debut || undefined} onChange={(e) => setForm((f) => ({ ...f, fin: e.target.value }))} />
            </label>
          </div>
          {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={save} disabled={busy}>Enregistrer</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>Annuler</Button>
          </div>
        </div>
      )}

      {!editing && t && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium"><CalendarRange className="size-3.5" /> Période écoulée</span>
            <span className="tabular-nums text-muted-foreground">
              {t.status === 'a_venir' ? 'Pas encore commencée' : t.status === 'termine' ? 'Terminée' : `${t.daysLeft} jour${t.daysLeft > 1 ? 's' : ''} restant${t.daysLeft > 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={t.timePercent} aria-label="Temps écoulé">
            <div className="h-full rounded-full bg-muted-foreground/50" style={{ width: `${t.timePercent}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>{fmtDate(data.debut)}</span>
            <span>{fmtDate(data.fin)}</span>
          </div>
          <p className="mt-2 text-sm">
            {data.achieved >= data.target && data.target > 0 ? (
              <span className="font-medium text-success-foreground-light">Objectif atteint 🎉</span>
            ) : t.status === 'termine' ? (
              <span className="text-muted-foreground">Période terminée à {data.percent} % de l'objectif.</span>
            ) : t.perWeekNeeded > 0 ? (
              <span>Rythme nécessaire : <strong className="tabular-nums">{t.perWeekNeeded}</strong> personne{t.perWeekNeeded > 1 ? 's' : ''} par semaine · {data.percent} % atteint pour {t.timePercent} % du temps</span>
            ) : null}
          </p>
          {data.monthly?.length > 1 && <MonthlyBars monthly={data.monthly} />}
        </div>
      )}
    </div>
  );
}
