import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HeartHandshake, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { resetPassword } from '../../api/auth';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('La confirmation ne correspond pas au mot de passe.');
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err?.message || 'Ce lien de réinitialisation est invalide ou a expiré.');
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
          {done ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="size-6" />
              </div>
              <h1 className="text-lg font-semibold tracking-tight">Mot de passe mis à jour</h1>
              <p className="text-sm text-muted-foreground">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              <Button size="lg" className="mt-2 w-full shadow-primary" onClick={() => navigate('/login', { replace: true })}>
                Aller à la connexion
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold tracking-tight">Nouveau mot de passe</h1>
              <p className="mt-1 text-sm text-muted-foreground">Choisissez un nouveau mot de passe pour votre compte.</p>

              <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-sm font-medium">Nouveau mot de passe</label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
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

                {error && (
                  <div className="flex flex-col gap-2">
                    <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>
                    <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">Demander un nouveau lien</Link>
                  </div>
                )}

                <Button type="submit" size="lg" disabled={submitting} className="mt-1 w-full shadow-primary">
                  {submitting ? 'Mise à jour…' : 'Réinitialiser le mot de passe'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
