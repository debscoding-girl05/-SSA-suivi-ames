import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { createMember, updateMember } from '../../api/members';

const STATUS_OPTIONS = [
  { value: 'nouveau', label: 'Nouveau' },
  { value: 'actif', label: 'Actif' },
  { value: 'inactif', label: 'Inactif' },
];

const FIELD_LABEL = 'text-sm font-medium';
const TEXTAREA_CLASS =
  'border-input bg-background text-foreground flex w-full rounded-lg border px-3 py-2 text-base shadow-xs outline-none resize-y focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm';

// Form for creating or editing a member. `member` null = create mode.
export default function MemberForm({ member, departments, onSaved, onCancel }) {
  const isEdit = Boolean(member);
  const [form, setForm] = useState({
    firstName: member?.firstName || '',
    lastName: member?.lastName || '',
    phone: member?.phone || '',
    email: member?.email || '',
    departmentId: member?.departmentId ? String(member.departmentId) : '',
    status: member?.status || 'nouveau',
    notes: member?.notes || '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setValue = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const departmentOptions = [
    { value: '', label: '— Aucun —' },
    ...departments.map((d) => ({ value: String(d.id), label: d.name })),
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      email: form.email,
      departmentId: form.departmentId ? Number(form.departmentId) : null,
      status: form.status,
      notes: form.notes,
    };
    try {
      const saved = isEdit
        ? await updateMember(member.id, payload)
        : await createMember(payload);
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
          <label htmlFor="firstName" className={FIELD_LABEL}>Prénom *</label>
          <Input id="firstName" value={form.firstName} onChange={setField('firstName')} required autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lastName" className={FIELD_LABEL}>Nom *</label>
          <Input id="lastName" value={form.lastName} onChange={setField('lastName')} required />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className={FIELD_LABEL}>Téléphone</label>
          <Input id="phone" type="tel" inputMode="tel" value={form.phone} onChange={setField('phone')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={FIELD_LABEL}>Email</label>
          <Input id="email" type="email" value={form.email} onChange={setField('email')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Département</span>
          <Select
            value={form.departmentId}
            onChange={setValue('departmentId')}
            options={departmentOptions}
            placeholder="— Aucun —"
            searchable
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Statut</span>
          <Select value={form.status} onChange={setValue('status')} options={STATUS_OPTIONS} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className={FIELD_LABEL}>Notes</label>
        <textarea
          id="notes"
          rows={3}
          value={form.notes}
          onChange={setField('notes')}
          className={TEXTAREA_CLASS}
        />
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
        </Button>
      </div>
    </form>
  );
}
