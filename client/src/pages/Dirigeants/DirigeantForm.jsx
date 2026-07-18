import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Copy, Check, MessageCircle, MessageSquare } from 'lucide-react';
import Input from '../../components/Input/Input';
import { createInvitation } from '../../api/invitations';
import { listDepartments } from '../../api/departments';
import { roleLabel } from '@/lib/roles';

const LABEL = 'text-sm font-medium';

// Roles offered on THIS screen — "Dirigeants" only lists field roles
// (leader/encadreur/leader_cellule; the list view itself excludes pasteur/pr).
// The backend also allows inviting "pr" via this endpoint, but doing so here
// would make the new account vanish from this list — confusing. A PR account
// should be invited from a dedicated admin screen instead.
const ROLE_OPTIONS = ['leader', 'encadreur', 'leader_cellule'].map((r) => ({ value: r, label: roleLabel(r) }));
const DEPARTMENT_REQUIRED_ROLES = ['leader', 'encadreur', 'leader_cellule'];

// Invite a new dirigeant (Pasteur/PR only). The admin only picks the email,
// role and department — the invited person fills in their own name, phone
// and password when they open the invite link. On success, shows the
// one-time link to copy and send manually (no email/SMS infra yet).
export default function DirigeantForm({ onSaved, onCancel }) {
  const [form, setForm] = useState({ email: '', role: 'leader', departmentId: '' });
  const [departments, setDepartments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null); // { ...invitation, token }
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    listDepartments().then((res) => setDepartments(res.data)).catch(() => setDepartments([]));
  }, []);

  const departmentOptions = [
    { value: '', label: '— Sélectionner —' },
    ...departments.map((d) => ({ value: String(d.id), label: d.name })),
  ];
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const departmentRequired = DEPARTMENT_REQUIRED_ROLES.includes(form.role);
  const inviteLink = created ? `${window.location.origin}/invitation/${created.token}` : '';

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        email: form.email,
        role: form.role,
        departmentId: form.departmentId || null,
      };
      const result = await createInvitation(payload);
      setCreated(result);
    } catch (err) {
      setError(err?.message || 'Invitation impossible.');
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Step 2: invitation created — show the one-time link.
  if (created) {
    const message = `Bonjour, voici votre lien d'invitation pour rejoindre l'application SSA : ${inviteLink}\nIl est valable 7 jours et à usage unique.`;
    const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`;
    const smsHref = `sms:?body=${encodeURIComponent(message)}`;
    return (
      <div className="flex flex-col gap-4 p-5">
        <p className="text-sm text-muted-foreground">
          Invitation créée pour <strong className="text-foreground">{created.email}</strong>.
          Envoie-lui ce lien — il est valable 7 jours et à usage unique.
        </p>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
          <a href={inviteLink} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-medium text-primary underline-offset-2 hover:underline">
            {inviteLink}
          </a>
          <Button type="button" variant="ghost" size="sm" onClick={copyLink} className="shrink-0">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copié' : 'Copier'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => window.open(whatsappHref, '_blank', 'noopener,noreferrer')}>
            <MessageCircle className="size-4" /> Envoyer par WhatsApp
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={() => window.open(smsHref, '_blank')}>
            <MessageSquare className="size-4" /> Envoyer par SMS
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Sans WhatsApp ni SMS, utilise le bouton « Copier » ci-dessus et colle le lien où tu veux (email, autre appli…).
        </p>
        <div className="flex justify-end pt-2">
          <Button type="button" onClick={() => onSaved?.()}>Terminer</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={LABEL}>Email</label>
        <Input id="email" type="email" value={form.email} onChange={setField('email')} required autoFocus />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="role" className={LABEL}>Rôle</label>
          <Select id="role" value={form.role} onChange={(v) => setForm((f) => ({ ...f, role: v }))} options={ROLE_OPTIONS} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="departmentId" className={LABEL}>
            Département {departmentRequired && <span className="text-destructive">*</span>}
          </label>
          <Select
            id="departmentId"
            value={form.departmentId}
            onChange={(v) => setForm((f) => ({ ...f, departmentId: v }))}
            options={departmentOptions}
            searchable
          />
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Envoi…' : "Créer l'invitation"}</Button>
      </div>
    </form>
  );
}
