import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Copy, Check, MessageCircle } from 'lucide-react';
import Input from '../../components/Input/Input';
import { createDirigeant, listDirigeants } from '../../api/dirigeants';
import { listDepartments } from '../../api/departments';
import { roleLabel } from '@/lib/roles';
import { useAuth } from '../../hooks/useAuth';

const LABEL = 'text-sm font-medium';
const FIELD_ROLES = ['leader', 'encadreur', 'leader_cellule'];
// Comptes « bureau » (lecture globale) — seul le Pasteur peut les créer.
const OFFICE_ROLES = ['pr', 'secretaire'];
const DEPARTMENT_REQUIRED_ROLES = ['leader', 'encadreur'];

// Création directe d'un compte (Pasteur/PR) : l'admin saisit tout, le serveur
// génère un mot de passe provisoire affiché UNE seule fois, à transmettre à la
// personne (qui le changera depuis son profil). Alternative à l'invitation
// par lien, pour qui n'a pas d'email consulté régulièrement.
export default function CreateAccountForm({ onSaved, onCancel }) {
  const { user } = useAuth();
  const roles = user?.role === 'pasteur' ? [...FIELD_ROLES, ...OFFICE_ROLES] : FIELD_ROLES;
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', role: 'encadreur', departmentId: '', leaderId: '' });
  const [departments, setDepartments] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    listDepartments().then((res) => setDepartments(res.data)).catch(() => setDepartments([]));
    listDirigeants().then((res) => setLeaders(res.data.filter((d) => d.role === 'leader' && d.isActive !== false))).catch(() => setLeaders([]));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const departmentRequired = DEPARTMENT_REQUIRED_ROLES.includes(form.role);

  // Leaders proposés : ceux du département choisi d'abord, puis les autres.
  const leaderOptions = useMemo(() => {
    const dep = Number(form.departmentId) || null;
    const sorted = [...leaders].sort((a, b) => (b.departmentId === dep) - (a.departmentId === dep) || String(a.fullName).localeCompare(String(b.fullName), 'fr'));
    return [
      { value: '', label: '— Aucun pour l’instant —' },
      ...sorted.map((l) => ({ value: l.id, label: `${l.fullName}${l.departmentName ? ` · ${l.departmentName}` : ''}` })),
    ];
  }, [leaders, form.departmentId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await createDirigeant({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        role: form.role,
        departmentId: form.departmentId || null,
        leaderId: form.role === 'encadreur' ? form.leaderId || null : null,
      });
      setCreated(result);
    } catch (err) {
      setError(err?.message || 'Création impossible.');
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    const loginUrl = `${window.location.origin}/login`;
    const message = `Bonjour ${created.fullName}, votre compte CSP-SSA est prêt.\nConnexion : ${loginUrl}\nIdentifiant : ${created.email}${created.phone ? ` (ou ${created.phone})` : ''}\nMot de passe provisoire : ${created.tempPassword}\nPensez à le changer depuis votre profil.`;
    return (
      <div className="flex flex-col gap-4 p-5">
        <p className="text-sm text-muted-foreground">
          Compte créé pour <strong className="text-foreground">{created.fullName}</strong> ({roleLabel(created.role)}).
          Voici son mot de passe provisoire — il ne sera <strong className="text-foreground">plus affiché</strong> ensuite.
        </p>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
          <code className="text-base font-semibold tracking-wide">{created.tempPassword}</code>
          <Button type="button" variant="ghost" size="sm" onClick={() => { navigator.clipboard?.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copié' : 'Copier le message'}
          </Button>
        </div>
        <Button type="button" variant="outline" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')}>
          <MessageCircle className="size-4" /> Envoyer par WhatsApp
        </Button>
        <div className="flex justify-end pt-2">
          <Button type="button" onClick={() => onSaved?.()}>Terminer</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ca-name" className={LABEL}>Nom complet *</label>
        <Input id="ca-name" value={form.fullName} onChange={set('fullName')} required autoFocus />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ca-email" className={LABEL}>Email (identifiant) *</label>
          <Input id="ca-email" type="email" value={form.email} onChange={set('email')} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ca-phone" className={LABEL}>Téléphone</label>
          <Input id="ca-phone" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ca-role" className={LABEL}>Rôle</label>
          <Select id="ca-role" value={form.role} onChange={(v) => setForm((f) => ({ ...f, role: v }))} options={roles.map((r) => ({ value: r, label: roleLabel(r) }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ca-dep" className={LABEL}>
            Département {departmentRequired && <span className="text-destructive">*</span>}
          </label>
          <Select
            id="ca-dep"
            value={form.departmentId}
            onChange={(v) => setForm((f) => ({ ...f, departmentId: v }))}
            options={[{ value: '', label: '— Sélectionner —' }, ...departments.map((d) => ({ value: String(d.id), label: d.name }))]}
            searchable
          />
        </div>
      </div>
      {form.role === 'encadreur' && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ca-leader" className={LABEL}>Leader responsable</label>
          <Select id="ca-leader" value={form.leaderId} onChange={(v) => setForm((f) => ({ ...f, leaderId: v }))} options={leaderOptions} searchable />
        </div>
      )}

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Création…' : 'Créer le compte'}</Button>
      </div>
    </form>
  );
}
