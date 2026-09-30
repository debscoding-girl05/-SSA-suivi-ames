import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { submitFicheCellule } from '../../api/cellules';

const PRESENCE = [
  { value: 'present', label: 'Présent', active: 'bg-success text-success-foreground' },
  { value: 'absent', label: 'Absent', active: 'bg-destructive text-destructive-foreground' },
  { value: 'justifie', label: 'Justifié', active: 'bg-warning text-warning-foreground' },
];
const TEXTAREA =
  'border-input bg-background text-foreground flex w-full rounded-lg border px-3 py-2 text-sm shadow-xs outline-none resize-y focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30';

export default function CelluleFicheForm({ celluleId, membres, fiche, onSaved, onCancel }) {
  const byId = Object.fromEntries((fiche?.presences || []).map((p) => [p.membreId, p.statut]));
  // Personne n'est pointé d'office : le leader indique chaque présence.
  const [presence, setPresence] = useState(Object.fromEntries(membres.map((m) => [m.id, byId[m.id] || null])));
  const [remarques, setRemarques] = useState(fiche?.remarques || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const presentCount = useMemo(() => Object.values(presence).filter((s) => s === 'present').length, [presence]);
  const unmarked = membres.filter((m) => !presence[m.id]).length;

  async function save(status) {
    setError('');
    if (status === 'soumis' && unmarked) {
      setError(`Fiche incomplète : ${unmarked} membre${unmarked > 1 ? 's' : ''} non pointé${unmarked > 1 ? 's' : ''}.`);
      return;
    }
    setBusy(true);
    try {
      await submitFicheCellule(celluleId, {
        status, remarques,
        presences: membres.filter((m) => presence[m.id]).map((m) => ({ membreId: m.id, statut: presence[m.id] })),
      });
      onSaved?.();
    } catch (e) { setError(e?.message || 'Enregistrement impossible.'); } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-4">
      {membres.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Ajoutez d'abord des membres à la cellule.</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Présence ({membres.length})</span>
            <span className="flex gap-3 tabular-nums">
              <span className="font-medium text-success-foreground-light">{presentCount} présent{presentCount > 1 ? 's' : ''}</span>
              {unmarked > 0 && <span className="font-medium text-warning-foreground">{unmarked} non pointé{unmarked > 1 ? 's' : ''}</span>}
            </span>
          </div>
          <div className="max-h-[40vh] overflow-y-auto rounded-xl border border-border">
            {membres.map((m) => (
              <div key={m.id} className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-0">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.nom}{m.estMembreEglise ? '' : ' · visiteur'}</span>
                <div className="flex shrink-0 rounded-lg border border-border p-0.5">
                  {PRESENCE.map((p) => (
                    <button key={p.value} type="button" onClick={() => setPresence((s) => ({ ...s, [m.id]: p.value }))}
                      className={cn('rounded-md px-2 py-1 text-xs font-medium transition-colors', presence[m.id] === p.value ? p.active : 'text-muted-foreground hover:bg-muted')}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rq" className="text-sm font-medium">Remarques</label>
        <textarea id="rq" rows={2} value={remarques} onChange={(e) => setRemarques(e.target.value)} className={TEXTAREA} />
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Fermer</Button>
        <Button type="button" variant="secondary" onClick={() => save('brouillon')} disabled={busy || !membres.length}>Brouillon</Button>
        <Button type="button" onClick={() => save('soumis')} disabled={busy || !membres.length}>Soumettre</Button>
      </div>
    </div>
  );
}
