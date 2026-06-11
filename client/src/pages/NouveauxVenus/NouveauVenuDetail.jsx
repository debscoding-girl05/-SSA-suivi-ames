import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Lock, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNouveauVenu, validerLecon, promouvoir } from '../../api/integration';
import { lessonTitle } from '@/lib/lecons';

// 7-lesson tracker for a nouveau venu + transition to membre régulier.
export default function NouveauVenuDetail({ id, canManage, onChanged, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setData(await getNouveauVenu(id)); setError(''); }
    catch (e) { setError(e?.message || 'Chargement impossible.'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  async function valider(lecon) {
    setBusy(true); setError('');
    try { await validerLecon(id, lecon); await load(); onChanged?.(); }
    catch (e) { setError(e?.message || 'Action impossible.'); }
    finally { setBusy(false); }
  }
  async function promote() {
    setBusy(true); setError('');
    try { await promouvoir(id); onChanged?.(); onClose?.(); }
    catch (e) { setError(e?.message || 'Action impossible.'); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="h-48 animate-pulse rounded-lg bg-muted" />;
  if (!data) return <p role="alert" className="text-sm text-destructive-foreground">{error}</p>;

  const { venu, validated, progress } = data;
  const next = validated + 1;
  const complete = validated >= 7;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{venu.departmentName} · {venu.dirigeantName}</p>
        <span className="rounded-md bg-primary-transparent px-2 py-0.5 text-xs font-medium text-primary">{validated}/7 leçons</span>
      </div>

      <ul className="overflow-hidden rounded-xl border border-border">
        {progress.map((p) => {
          const done = p.statut === 'validee';
          const isNext = !done && p.lecon === next;
          return (
            <li key={p.lecon} className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-0">
              <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                done ? 'bg-success-foreground-light text-white' : isNext ? 'bg-warning-foreground-light text-white' : 'bg-muted text-muted-foreground')}>
                {done ? <Check className="size-3.5" /> : p.lecon}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm', done ? 'font-medium' : 'text-muted-foreground')}>{lessonTitle(p.lecon)}</p>
                {done && p.validatedAt && (
                  <p className="text-xs text-muted-foreground">Validée le {new Date(p.validatedAt).toLocaleDateString('fr-FR')}{p.validantName ? ` · ${p.validantName}` : ''}</p>
                )}
              </div>
              {canManage && isNext && (
                <Button size="sm" onClick={() => valider(p.lecon)} disabled={busy}>Valider</Button>
              )}
              {!done && !isNext && <Lock className="size-3.5 text-muted-foreground/50" />}
            </li>
          );
        })}
      </ul>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Fermer</Button>
        {canManage && complete && (
          <Button type="button" onClick={promote} disabled={busy}>
            <GraduationCap className="size-4" /> Passer en membre régulier
          </Button>
        )}
      </div>
    </div>
  );
}
