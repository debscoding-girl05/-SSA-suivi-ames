import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { createDirigeant, updateDirigeant } from '../../api/dirigeants';
import { listDepartments } from '../../api/departments';

const LABEL = 'text-sm font-medium';
const ROLE_OPTIONS = [
  { value: 'leader', label: 'Leader (responsable de département)' },
  { value: 'encadreur', label: 'Encadreur' },
];

// Créer / éditer un compte dirigeant. `dirigeant` null = création.
// En édition, seuls nom / téléphone / département sont modifiables (PUT).
export default function DirigeantForm({ dirigeant, onSaved, onCancel }) {
  const isEdit = Boolean(dirigeant);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    fullName: dirigeant?.fullName || '',
    role: dirigeant?.role || 'leader',
    phone: dirigeant?.phone || '',
    email: dirigeant?.email && !dirigeant.email.endsWith('@ssa.local') ? dirigeant.email : '',
    password: '',
    departmentId: dirigeant?.departmentId ? String(dirigeant.departmentId) : '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listDepartments().then((res) => setDepartments(res.data)).catch(() => setDepartments([]));
  }, []);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const deptOptions = [{ value: '', label: '— Aucun —' }, ...departments.map((d) => ({ value: String(d.id), label: d.name }))];

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      if (isEdit) {
        const saved = await updateDirigeant(dirigeant.id, {
          fullName: form.fullName,
          phone: form.phone,
          departmentId: form.departmentId || null,
        });
        onSaved?.(saved);
      } else {
        const saved = await createDirigeant({
          fullName: form.fullName,
          role: form.role,
          phone: form.phone,
          email: form.email || undefined,
          password: form.password,
          departmentId: form.departmentId || undefined,
        });
        onSaved?.(saved);
      }
    } catch (err) {
      setError(err?.message || 'Enregistrement impossible.');
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="d-nom" className={LABEL}>Nom complet *</label>
        <Input id="d-nom" value={form.fullName} onChange={setField('fullName')} required autoFocus />
      </div>

      {!isEdit && (
        <div className="flex flex-col gap-1.5">
          <span className={LABEL}>Rôle *</span>
          <Select value={form.role} onChange={(v) => setForm((f) => ({ ...f, role: v }))} options={ROLE_OPTIONS} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="d-tel" className={LABEL}>Téléphone *</label>
          <Input id="d-tel" type="tel" inputMode="tel" value={form.phone} onChange={setField('phone')} required />
          {!isEdit && <p className="text-xs text-muted-foreground">Sert d'identifiant de connexion.</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={LABEL}>Département</span>
          <Select value={form.departmentId} onChange={(v) => setForm((f) => ({ ...f, departmentId: v }))} options={deptOptions} searchable />
        </div>
      </div>

      {!isEdit && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="d-email" className={LABEL}>Email (optionnel)</label>
            <Input id="d-email" type="email" value={form.email} onChange={setField('email')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="d-mdp" className={LABEL}>Mot de passe *</label>
            <Input id="d-mdp" type="password" value={form.password} onChange={setField('password')} required minLength={6} />
            <p className="text-xs text-muted-foreground">Au moins 6 caractères.</p>
          </div>
        </div>
      )}

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Annuler</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le compte'}</Button>
      </div>
    </form>
  );
}
