import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HeartHandshake, Eye, EyeOff, Building2 } from 'lucide-react';
import { getInvitationByToken, acceptInvitation } from '../../api/invitations';
import { useAuth } from '../../hooks/useAuth';
import { roleLabel } from '@/lib/roles';

export default function AcceptInvitationPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getInvitationByToken(token)
      .then(setInvitation)
      .catch((err) => setLoadError(err?.message || "Cette invitation n'est plus valide."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('La confirmation ne correspond pas au mot de passe.');
      return;
    }
    setSubmitting(true);
    try {
      const { token: sessionToken, user } = await acceptInvitation(token, { fullName, phone, password });
      setSession(sessionToken, user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Impossible de finaliser le compte.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-app px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-primary">
            <HeartHandshake className="size-7" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Suivi des Âmes</h1>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-7">
          {loading ? (
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-destructive-dark">{loadError}</p>
              <Button variant="outline" onClick={() => navigate('/login')}>Aller à la connexion</Button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold tracking-tight">Finalisez votre compte</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="size-3.5" />
                Invité(e) en tant que <strong className="text-foreground">{roleLabel(invitation.role)}</strong>
                {invitation.departmentName ? ` · ${invitation.departmentName}` : ''}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{invitation.email}</p>

              <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="fullName" className="text-sm font-medium">Nom complet</label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="phone" className="text-sm font-medium">Téléphone</label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-sm font-medium">Mot de passe</label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Au moins 8 caractères, avec une majuscule, un chiffre et un caractère spécial.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">Confirmer le mot de passe</label>
                  <Input id="confirmPassword" type={showPwd ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>

                {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

                <Button type="submit" size="lg" disabled={submitting} className="mt-1 w-full shadow-primary">
                  {submitting ? 'Création…' : 'Créer mon compte'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
