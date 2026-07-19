import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Input from '../../components/Input/Input';
import { createCellule, updateCellule } from '../../api/cellules';
import { listDirigeants } from '../../api/dirigeants';

const LABEL = 'text-sm font-medium';
const FIELD =
  'border-input bg-background text-foreground flex h-10 w-full rounded-lg border px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm';

// Create/edit a cellule de prière. `cellule` (optional) = edit mode.
export default function CelluleForm({ cellule, onSaved, onCancel }) {
  const [form, setForm] = useState({
    nom: cellule?.nom || '',
    leaderId: cellule?.leaderId || '',
    jourReunion: cellule?.jourReunion || '',
    lieu: cellule?.lieu || '',
  });
  const [leaders, setLeaders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listDirigeants()
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.dirigeants || [];
        setLeaders(list.filter((d) => d.role === 'leader_cellule'));
      })
      .catch(() => setLeaders([]));
  }, []);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        nom: form.nom,
        leaderId: form.leaderId || null,
        jourReunion: form.jourReunion || null,
        lieu: form.lieu || null,
      };
      if (cellule) await updateCellule(cellule.id, payload);
      else await createCellule(payload);
      onSaved?.();
    } catch (err) {
      setError(err?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nom" className={LABEL}>Nom de la cellule</label>
        <Input id="nom" value={form.nom} onChange={setField('nom')} required placeholder="Ex. Cellule Béthel" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="leaderId" className={LABEL}>Leader de cellule</label>
        <select id="leaderId" value={form.leaderId} onChange={setField('leaderId')} className={FIELD}>
          <option value="">— Aucun pour l'instant —</option>
          {leaders.map((l) => (
            <option key={l.id} value={l.id}>{l.fullName}</option>
          ))}
        </select>
        {leaders.length === 0 && (
          <p className="text-xs text-muted-foreground">Aucun compte avec le rôle « Leader de cellule » pour le moment.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="jourReunion" className={LABEL}>Jour de réunion</label>
          <Input id="jourReunion" value={form.jourReunion} onChange={setField('jourReunion')} placeholder="Ex. Mardi" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lieu" className={LABEL}>Lieu</label>
          <Input id="lieu" value={form.lieu} onChange={setField('lieu')} placeholder="Ex. Quartier X" />
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : cellule ? 'Enregistrer' : 'Créer'}</Button>
      </div>
    </form>
  );
}
