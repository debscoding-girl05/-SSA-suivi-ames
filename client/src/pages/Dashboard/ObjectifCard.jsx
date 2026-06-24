import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Target, Pencil } from 'lucide-react';
import ProgressRing from '../../components/ProgressRing';
import { getObjectif, setObjectif } from '../../api/objectif';

// Objectif d'évangélisation — visible & modifiable par le Pasteur uniquement.
export default function ObjectifCard() {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let on = true;
    getObjectif().then((d) => { if (on) { setData(d); setValue(String(d.target || '')); } }).catch(() => {});
    return () => { on = false; };
  }, []);

  async function save() {
    setBusy(true);
    try { const d = await setObjectif(Number(value) || 0); setData(d); setEditing(false); }
    catch { /* noop */ } finally { setBusy(false); }
  }

  if (!data) return null;

  return (
    <div className="flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Target className="size-3.5" /> Objectif d'évangélisation
        </p>
        {editing ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} className="w-28" autoFocus />
            <Button size="sm" onClick={save} disabled={busy}>Enregistrer</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>Annuler</Button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {data.achieved}<span className="text-xl text-muted-foreground">/{data.target || '—'}</span>
            </p>
            <p className="text-xs text-muted-foreground">personnes suivies</p>
            <button type="button" onClick={() => { setValue(String(data.target || '')); setEditing(true); }} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <Pencil className="size-3" /> Modifier l'objectif
            </button>
          </>
        )}
      </div>
      <ProgressRing value={data.achieved} total={data.target} label="atteint" size={104} />
    </div>
  );
}
