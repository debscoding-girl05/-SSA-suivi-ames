import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { getDirigeant } from '../../api/dirigeants';
import { myRapport, submitRapport } from '../../api/rapports';

const PRESENCE = [
  { value: 'present', label: 'Présent', active: 'bg-success text-success-foreground' },
  { value: 'absent', label: 'Absent', active: 'bg-destructive text-destructive-foreground' },
  { value: 'justifie', label: 'Justifié', active: 'bg-warning text-warning-foreground' },
];

const TEXTAREA =
  'border-input bg-background text-foreground flex w-full rounded-lg border px-3 py-2 text-base shadow-xs outline-none resize-y focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm';

// Weekly attendance fiche for the connected dirigeant: one presence status per
// assigné + remarks. Save as draft (brouillon) or submit (soumis, then locked).
export default function RapportForm({ onSaved, onCancel }) {
  const { user } = useAuth();
  const [assignes, setAssignes] = useState([]);
  const [presence, setPresence] = useState({});
  const [remarques, setRemarques] = useState('');
  const [status, setStatus] = useState(null); // existing fiche status
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [dir, fiche] = await Promise.all([getDirigeant(user.id), myRapport()]);
        if (!active) return;
        const list = dir.assignes || [];
        setAssignes(list);
        const byId = Object.fromEntries((fiche.presences || []).map((p) => [p.assigneId, p.statut]));
        setPresence(Object.fromEntries(list.map((a) => [a.id, byId[a.id] || 'present'])));
        setRemarques(fiche.rapport?.remarques || '');
        setStatus(fiche.rapport?.status || null);
      } catch (err) {
        if (active) setError(err?.message || 'Chargement impossible.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user.id]);

  const readOnly = status === 'soumis';
  const presentCount = useMemo(
    () => Object.values(presence).filter((s) => s === 'present').length,
    [presence]
  );

  async function save(nextStatus) {
    setError('');
    setSaving(true);
    try {
      await submitRapport({
        status: nextStatus,
        remarques,
        presences: assignes.map((a) => ({ assigneId: a.id, statut: presence[a.id] || 'present' })),
      });
      onSaved?.();
    } catch (err) {
      setError(err?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {readOnly && (
        <p className="rounded-lg bg-success px-3 py-2 text-sm font-medium text-success-foreground">
          Fiche déjà soumise — lecture seule.
        </p>
      )}

      {assignes.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Aucun assigné à pointer.</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Présence ({assignes.length} assigné{assignes.length > 1 ? 's' : ''})</span>
            <span className="font-medium tabular-nums text-success-foreground-light">{presentCount} présent{presentCount > 1 ? 's' : ''}</span>
          </div>
          <div className="max-h-[42vh] overflow-y-auto rounded-xl border border-border">
            {assignes.map((a) => (
              <div key={a.id} className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-0">
                <Avatar name={`${a.firstName} ${a.lastName}`} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.firstName} {a.lastName}</span>
                <div className="flex shrink-0 rounded-lg border border-border p-0.5">
                  {PRESENCE.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      disabled={readOnly}
                      onClick={() => setPresence((m) => ({ ...m, [a.id]: p.value }))}
                      className={cn(
                        'rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:cursor-default',
                        presence[a.id] === p.value ? p.active : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
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
        <label htmlFor="remarques" className="text-sm font-medium">Remarques</label>
        <textarea
          id="remarques"
          rows={2}
          value={remarques}
          onChange={(e) => setRemarques(e.target.value)}
          disabled={readOnly}
          className={cn(TEXTAREA, readOnly && 'opacity-60')}
        />
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Fermer</Button>
        {!readOnly && (
          <>
            <Button type="button" variant="secondary" onClick={() => save('brouillon')} disabled={saving}>
              Enregistrer brouillon
            </Button>
            <Button type="button" onClick={() => save('soumis')} disabled={saving}>
              {saving ? 'Envoi…' : 'Soumettre la fiche'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
