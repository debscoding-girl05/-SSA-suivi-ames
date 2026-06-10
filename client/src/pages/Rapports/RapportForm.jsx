import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { submitRapport } from '../../api/rapports';

const LABEL = 'text-sm font-medium';
const TEXTAREA =
  'border-input bg-background text-foreground flex w-full rounded-lg border px-3 py-2 text-base shadow-xs outline-none resize-y focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm';

// Submit/update the connected dirigeant's report for the current week.
export default function RapportForm({ existing, onSaved, onCancel }) {
  const [form, setForm] = useState({
    presentCount: existing?.presentCount ?? 0,
    absents: existing?.absents || '',
    remarques: existing?.remarques || '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await submitRapport({
        presentCount: Number(form.presentCount) || 0,
        absents: form.absents,
        remarques: form.remarques,
      });
      onSaved?.();
    } catch (err) {
      setError(err?.message || 'Soumission impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="presentCount" className={LABEL}>Présents cette semaine</label>
        <Input id="presentCount" type="number" min="0" value={form.presentCount} onChange={setField('presentCount')} required autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="absents" className={LABEL}>Absents (noms)</label>
        <Input id="absents" value={form.absents} onChange={setField('absents')} placeholder="Séparés par des virgules" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="remarques" className={LABEL}>Remarques</label>
        <textarea id="remarques" rows={3} value={form.remarques} onChange={setField('remarques')} className={TEXTAREA} />
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Annuler</Button>
        <Button type="submit" disabled={submitting}>{submitting ? 'Envoi…' : 'Soumettre la fiche'}</Button>
      </div>
    </form>
  );
}
