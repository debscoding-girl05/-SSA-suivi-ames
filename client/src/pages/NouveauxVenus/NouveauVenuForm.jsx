import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registerNouveauVenu } from '../../api/integration';

const LABEL = 'text-sm font-medium';
const FIELD =
  'border-input bg-background text-foreground flex h-10 w-full rounded-lg border px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm';

// Quick registration of a nouveau venu (CDC: < 2 min).
export default function NouveauVenuForm({ onSaved, onCancel }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', sexe: '', dateNaissance: '', zoneResidence: '', firstSeenAt: today });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await registerNouveauVenu(form);
      onSaved?.();
    } catch (err) {
      setError(err?.message || 'Enregistrement impossible.');
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fn" className={LABEL}>Prénom *</label>
          <Input id="fn" value={form.firstName} onChange={setField('firstName')} required autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ln" className={LABEL}>Nom *</label>
          <Input id="ln" value={form.lastName} onChange={setField('lastName')} required />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ph" className={LABEL}>Téléphone</label>
          <Input id="ph" type="tel" inputMode="tel" value={form.phone} onChange={setField('phone')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sx" className={LABEL}>Sexe</label>
          <select id="sx" value={form.sexe} onChange={setField('sexe')} className={FIELD}>
            <option value="">—</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dn" className={LABEL}>Date de naissance</label>
          <Input id="dn" type="date" value={form.dateNaissance} onChange={setField('dateNaissance')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="zr" className={LABEL}>Zone de résidence</label>
          <Input id="zr" value={form.zoneResidence} onChange={setField('zoneResidence')} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fs" className={LABEL}>Date de 1ʳᵉ présence</label>
          <Input id="fs" type="date" value={form.firstSeenAt} onChange={setField('firstSeenAt')} />
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Annuler</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button>
      </div>
    </form>
  );
}
