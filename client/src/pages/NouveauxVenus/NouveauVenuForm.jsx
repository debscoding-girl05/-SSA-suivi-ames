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
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', sexe: '', dateNaissance: '', zoneResidence: '', firstSeenAt: today, isVisiteur: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState(null); // existing contact on a 409
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function doRegister(force) {
    setError(''); setBusy(true);
    try {
      await registerNouveauVenu({ ...form, force });
      onSaved?.();
    } catch (err) {
      if (err?.code === 'DUPLICATE') {
        setDuplicate(err.data?.existing || {});
        setError('');
      } else {
        setError(err?.message || 'Enregistrement impossible.');
      }
    } finally { setBusy(false); }
  }

  function submit(e) {
    e.preventDefault();
    setDuplicate(null);
    doRegister(false);
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

      <label className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
        <input
          type="checkbox"
          checked={form.isVisiteur}
          onChange={(e) => setForm((f) => ({ ...f, isVisiteur: e.target.checked }))}
          className="size-4 accent-[var(--primary)]"
        />
        <span className="text-sm font-medium">Visiteur</span>
        <span className="text-xs text-muted-foreground">(de passage, pas encore engagé)</span>
      </label>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      {duplicate && (
        <div className="rounded-lg border border-warning-foreground/20 bg-warning px-3 py-2.5 text-sm text-warning-foreground">
          <p className="font-medium">Doublon possible : ce numéro est déjà enregistré.</p>
          <p className="mt-0.5 text-xs">
            {duplicate.firstName} {duplicate.lastName}
            {duplicate.dirigeantName ? ` · suivi par ${duplicate.dirigeantName}` : ''}
            {duplicate.departmentName ? ` (${duplicate.departmentName})` : ''}.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Annuler</Button>
        {duplicate ? (
          <Button type="button" variant="secondary" onClick={() => doRegister(true)} disabled={busy}>
            Enregistrer quand même
          </Button>
        ) : (
          <Button type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button>
        )}
      </div>
    </form>
  );
}
