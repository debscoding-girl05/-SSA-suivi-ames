import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createAssigne, updateAssigne } from '../../api/dirigeants';

const LABEL = 'text-sm font-medium';
const TEXTAREA =
  'border-input bg-background text-foreground flex w-full rounded-lg border px-3 py-2 text-base shadow-xs outline-none resize-y focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm';

// Add/edit an assigné for a given dirigeant. `assigne` null = create mode.
export default function AssigneForm({ dirigeantId, assigne, onSaved, onCancel }) {
  const isEdit = Boolean(assigne);
  const [form, setForm] = useState({
    firstName: assigne?.firstName || '',
    lastName: assigne?.lastName || '',
    phone: assigne?.phone || '',
    email: assigne?.email || '',
    notes: assigne?.notes || '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const saved = isEdit
        ? await updateAssigne(dirigeantId, assigne.id, form)
        : await createAssigne(dirigeantId, form);
      onSaved?.(saved);
    } catch (err) {
      setError(err?.message || 'Enregistrement impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="firstName" className={LABEL}>Prénom *</label>
          <Input id="firstName" value={form.firstName} onChange={setField('firstName')} required autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lastName" className={LABEL}>Nom *</label>
          <Input id="lastName" value={form.lastName} onChange={setField('lastName')} required />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className={LABEL}>Téléphone</label>
          <Input id="phone" type="tel" inputMode="tel" value={form.phone} onChange={setField('phone')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={LABEL}>Email</label>
          <Input id="email" type="email" value={form.email} onChange={setField('email')} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className={LABEL}>Notes</label>
        <textarea id="notes" rows={3} value={form.notes} onChange={setField('notes')} className={TEXTAREA} />
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Annuler</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
        </Button>
      </div>
    </form>
  );
}
