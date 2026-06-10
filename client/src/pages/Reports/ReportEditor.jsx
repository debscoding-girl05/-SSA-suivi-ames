import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wand2 } from 'lucide-react';
import { aggregateReport, createReport, updateReport, transmitReport } from '../../api/reports';

const TEXTAREA =
  'border-input bg-background text-foreground flex w-full rounded-lg border px-3 py-2 text-sm shadow-xs outline-none resize-y focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30';

// Create or edit a report document. `report` null = create mode.
export default function ReportEditor({ report, onSaved, onCancel }) {
  const isEdit = Boolean(report);
  const [title, setTitle] = useState(report?.title || '');
  const [content, setContent] = useState(report?.content || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function prefill() {
    setError('');
    try {
      const a = await aggregateReport();
      setTitle((t) => t || a.title);
      setContent(a.content);
    } catch (e) {
      setError(e?.message || 'Pré-remplissage impossible.');
    }
  }

  async function persist(transmit) {
    if (!title.trim()) { setError('Le titre est requis.'); return; }
    setBusy(true); setError('');
    try {
      const saved = isEdit
        ? await updateReport(report.id, { title, content })
        : await createReport({ title, content });
      if (transmit) await transmitReport(saved.id);
      onSaved?.();
    } catch (e) {
      setError(e?.message || 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="r-title" className="text-sm font-medium">Titre</label>
        <Input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rapport hebdomadaire…" autoFocus />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="r-content" className="text-sm font-medium">Contenu</label>
          <Button type="button" variant="ghost" size="sm" onClick={prefill} disabled={busy}>
            <Wand2 className="size-3.5" /> Pré-remplir depuis les fiches
          </Button>
        </div>
        <textarea id="r-content" rows={10} value={content} onChange={(e) => setContent(e.target.value)} className={TEXTAREA} placeholder="Texte libre, synthèse, observations…" />
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Annuler</Button>
        <Button type="button" variant="secondary" onClick={() => persist(false)} disabled={busy}>Enregistrer</Button>
        <Button type="button" onClick={() => persist(true)} disabled={busy}>{busy ? '…' : 'Transmettre'}</Button>
      </div>
    </div>
  );
}
