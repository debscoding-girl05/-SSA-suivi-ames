import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { getDirigeant } from '../../api/dirigeants';
import { getFiche, submitRapport, validateFiche, requestChanges } from '../../api/rapports';

const PRESENCE = [
  { value: 'present', label: 'Présent', active: 'bg-success text-success-foreground' },
  { value: 'absent', label: 'Absent', active: 'bg-destructive text-destructive-foreground' },
  { value: 'justifie', label: 'Justifié', active: 'bg-warning text-warning-foreground' },
];

const TEXTAREA =
  'border-input bg-background text-foreground flex w-full rounded-lg border px-3 py-2 text-base shadow-xs outline-none resize-y focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm';

// Weekly fiche. mode='edit' (author fills/submits) or 'review' (responsable
// validates / asks for a correction). `dirigeantId` defaults to the connected user.
export default function RapportForm({ dirigeantId, mode = 'edit', onSaved, onCancel }) {
  const { user } = useAuth();
  const targetId = dirigeantId || user.id;
  const isReview = mode === 'review';

  const [assignes, setAssignes] = useState([]);
  const [presence, setPresence] = useState({});
  const [remarques, setRemarques] = useState('');
  const [status, setStatus] = useState(null);
  const [reviewComment, setReviewComment] = useState(null);
  const [ficheId, setFicheId] = useState(null);
  const [name, setName] = useState('');
  const [comment, setComment] = useState(''); // reviewer's new comment
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [dir, fiche] = await Promise.all([getDirigeant(targetId), getFiche(targetId)]);
        if (!active) return;
        const list = dir.assignes || [];
        setAssignes(list);
        setName(dir.dirigeant?.fullName || '');
        const byId = Object.fromEntries((fiche.presences || []).map((p) => [p.assigneId, p.statut]));
        setPresence(Object.fromEntries(list.map((a) => [a.id, byId[a.id] || 'present'])));
        setRemarques(fiche.rapport?.remarques || '');
        setStatus(fiche.rapport?.status || null);
        setReviewComment(fiche.rapport?.reviewComment || null);
        setFicheId(fiche.rapport?.id || null);
      } catch (err) {
        if (active) setError(err?.message || 'Chargement impossible.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [targetId]);

  // Author can edit only a draft, a returned fiche, or a brand-new one.
  const editable = !isReview && (status === null || status === 'brouillon' || status === 'a_corriger');
  const presentCount = useMemo(() => Object.values(presence).filter((s) => s === 'present').length, [presence]);

  async function save(nextStatus) {
    setError(''); setBusy(true);
    try {
      await submitRapport({
        status: nextStatus,
        remarques,
        presences: assignes.map((a) => ({ assigneId: a.id, statut: presence[a.id] || 'present' })),
      });
      onSaved?.();
    } catch (err) {
      setError(err?.message || 'Enregistrement impossible.');
    } finally { setBusy(false); }
  }

  async function review(action) {
    setError('');
    if (action === 'request' && !comment.trim()) {
      setError('Un commentaire est requis pour demander une correction.');
      return;
    }
    setBusy(true);
    try {
      if (action === 'validate') await validateFiche(ficheId, comment.trim() || undefined);
      else await requestChanges(ficheId, comment.trim());
      onSaved?.();
    } catch (err) {
      setError(err?.message || 'Action impossible.');
    } finally { setBusy(false); }
  }

  if (loading) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;

  const statusBanner = () => {
    if (isReview) return null;
    if (status === 'a_corriger') return <Banner tone="warn">Correction demandée{reviewComment ? ` : « ${reviewComment} »` : ''}</Banner>;
    if (status === 'soumis') return <Banner tone="info">Fiche soumise — en attente de validation.</Banner>;
    if (status === 'valide') return <Banner tone="ok">Fiche validée ✅</Banner>;
    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      {isReview && <p className="text-sm text-muted-foreground">Fiche de <span className="font-medium text-foreground">{name}</span></p>}
      {statusBanner()}

      {assignes.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Aucun assigné à pointer.</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Présence ({assignes.length})</span>
            <span className="font-medium tabular-nums text-success-foreground-light">{presentCount} présent{presentCount > 1 ? 's' : ''}</span>
          </div>
          <div className="max-h-[40vh] overflow-y-auto rounded-xl border border-border">
            {assignes.map((a) => (
              <div key={a.id} className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-0">
                <Avatar name={`${a.firstName} ${a.lastName}`} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.firstName} {a.lastName}</span>
                <div className="flex shrink-0 rounded-lg border border-border p-0.5">
                  {PRESENCE.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      disabled={!editable}
                      onClick={() => setPresence((m) => ({ ...m, [a.id]: p.value }))}
                      className={cn(
                        'rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:cursor-default',
                        presence[a.id] === p.value ? p.active : 'text-muted-foreground enabled:hover:bg-muted'
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
        <textarea id="remarques" rows={2} value={remarques} onChange={(e) => setRemarques(e.target.value)} disabled={!editable} className={cn(TEXTAREA, !editable && 'opacity-70')} />
      </div>

      {/* Reviewer comment */}
      {isReview && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="comment" className="text-sm font-medium">Commentaire au dirigeant</label>
          <textarea id="comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Obligatoire pour une demande de correction" className={TEXTAREA} />
        </div>
      )}

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Fermer</Button>
        {isReview ? (
          <>
            <Button type="button" variant="secondary" onClick={() => review('request')} disabled={busy || !ficheId}>
              Demander une correction
            </Button>
            <Button type="button" onClick={() => review('validate')} disabled={busy || !ficheId}>
              {busy ? '…' : 'Valider'}
            </Button>
          </>
        ) : editable ? (
          <>
            <Button type="button" variant="secondary" onClick={() => save('brouillon')} disabled={busy}>Brouillon</Button>
            <Button type="button" onClick={() => save('soumis')} disabled={busy}>{busy ? 'Envoi…' : 'Soumettre'}</Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Banner({ tone, children }) {
  const tones = {
    warn: 'bg-warning text-warning-foreground',
    info: 'bg-primary-transparent text-primary',
    ok: 'bg-success text-success-foreground',
  };
  return <p className={cn('rounded-lg px-3 py-2 text-sm font-medium', tones[tone])}>{children}</p>;
}
