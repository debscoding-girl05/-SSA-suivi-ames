import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import Input from '../../components/Input/Input';
import { changePassword } from '../../api/auth';

const LABEL = 'text-sm font-medium';

// Self-service password change (CDC EF-04). Requires the current password.
export default function ChangePasswordForm({ onDone, onCancel }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err?.message || 'Changement impossible.');
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-success text-success-foreground">
          <Check className="size-6" />
        </span>
        <p className="text-sm font-medium">Mot de passe changé avec succès.</p>
        <Button type="button" onClick={onDone}>Fermer</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="currentPassword" className={LABEL}>Mot de passe actuel</label>
        <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className={LABEL}>Nouveau mot de passe</label>
        <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">Au moins 8 caractères, avec une majuscule, un chiffre et un caractère spécial.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className={LABEL}>Confirmer le nouveau mot de passe</label>
        <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Changement…' : 'Changer le mot de passe'}</Button>
      </div>
    </form>
  );
}
