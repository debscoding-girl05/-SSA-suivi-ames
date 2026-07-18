import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserCog, Plus, Phone, Mail, HeartHandshake, ArrowLeft, Copy, Check, MessageCircle, MessageSquare } from 'lucide-react';
import { celluleLeaders } from '../../api/cellules';
import { createInvitation } from '../../api/invitations';
import { useAuth } from '../../hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

const EMPTY = { email: '' };

// Invite a new cellule leader (Pasteur/PR only). Cellules are independent of
// departments (CDC §3.3), so no department picker here — the invited person
// fills in their own name, phone and password when they open the invite link.
export default function LeadersCellulePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null); // { ...invitation, token }
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try { setData((await celluleLeaders()).data); setError(''); }
    catch (e) { setError(e?.message || 'Chargement impossible.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  // Réservé au Pasteur / PR.
  if (user && !isAdminRole(user.role)) return <Navigate to="/cellules" replace />;

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function openCreate() { setForm(EMPTY); setFormError(''); setCreated(null); setOpen(true); }

  async function create(e) {
    e.preventDefault();
    setFormError(''); setBusy(true);
    try {
      const result = await createInvitation({ email: form.email, role: 'leader_cellule', departmentId: null });
      setCreated(result);
    } catch (er) {
      setFormError(er?.message || 'Invitation impossible.');
    } finally { setBusy(false); }
  }

  const inviteLink = created ? `${window.location.origin}/invitation/${created.token}` : '';
  function copyLink() {
    navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function closeModal() { setOpen(false); if (created) load(); }

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={() => navigate('/cellules')} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Cellules
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leaders de cellule</h1>
          <p className="text-sm text-muted-foreground">Comptes des responsables de cellules de prière</p>
        </div>
        <Button onClick={openCreate}><Plus className="size-4" /> Inviter un leader</Button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border border-border bg-card" />
      ) : data.length === 0 ? (
        <EmptyState icon={UserCog} title="Aucun leader de cellule" description="Invitez un responsable pour qu'il puisse gérer sa cellule et soumettre les fiches de présence." action={<Button size="sm" onClick={openCreate}><Plus className="size-4" /> Inviter un leader</Button>} />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {data.map((l) => (
            <li key={l.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-transparent text-primary"><UserCog className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{l.fullName}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {l.phone && <span className="flex items-center gap-1"><Phone className="size-3.5" />{l.phone}</span>}
                  {l.email && !l.email.endsWith('@ssa.local') && <span className="flex items-center gap-1"><Mail className="size-3.5" />{l.email}</span>}
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <HeartHandshake className="size-3.5" /> {l.celluleCount} cellule{l.celluleCount > 1 ? 's' : ''}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={closeModal} title="Inviter un leader de cellule">
        {created ? (() => {
          const message = `Bonjour, voici votre lien d'invitation pour rejoindre l'application SSA : ${inviteLink}\nIl est valable 7 jours et à usage unique.`;
          const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`;
          const smsHref = `sms:?body=${encodeURIComponent(message)}`;
          return (
            <div className="flex flex-col gap-4 p-1">
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
                Sans WhatsApp ni SMS, utilise le bouton « Copier » ci-dessus et colle le lien où tu veux.
              </p>
              <div className="flex justify-end pt-2">
                <Button type="button" onClick={closeModal}>Terminer</Button>
              </div>
            </div>
          );
        })() : (
          <form onSubmit={create} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="l-email" className="text-sm font-medium">Email *</label>
              <Input id="l-email" type="email" value={form.email} onChange={setField('email')} required autoFocus />
              <p className="text-xs text-muted-foreground">La personne invitée choisit son nom, son téléphone et son mot de passe en acceptant l'invitation.</p>
            </div>

            {formError && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{formError}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Annuler</Button>
              <Button type="submit" disabled={busy}>{busy ? 'Envoi…' : "Envoyer l'invitation"}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
