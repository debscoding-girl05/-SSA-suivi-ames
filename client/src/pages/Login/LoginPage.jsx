import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, AtSign, LockKeyhole, ArrowRight, AlertCircle } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';
import { useAuth } from '../../hooks/useAuth';

const FIELD = 'h-12 rounded-xl border-foreground/15 bg-background pl-11 text-base shadow-none md:h-12 md:text-[15px]';
const ICON = 'pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(identifier, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err?.message || 'Connexion impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      footer={
        <div className="mt-5 rounded-2xl border border-dashed border-border px-4 py-3 text-center text-sm text-muted-foreground">
          Pas encore de compte ? Demandez à la PR ou au Pasteur de vous en créer un.
        </div>
      }
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Espace de suivi pastoral</p>
      <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight">Bienvenue</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Connectez-vous avec votre email ou votre numéro de téléphone.</p>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-5" noValidate={false}>
        <div className="flex flex-col gap-2">
          <label htmlFor="identifier" className="text-sm font-medium">Email ou téléphone</label>
          <div className="relative">
            <AtSign aria-hidden className={ICON} />
            <Input
              id="identifier"
              type="text"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              placeholder="vous@ssa.app ou +237 6…"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoFocus
              className={FIELD}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">Mot de passe</label>
            <Link to="/forgot-password" className="rounded text-sm font-medium text-primary hover:underline">Mot de passe oublié ?</Link>
          </div>
          <div className="relative">
            <LockKeyhole aria-hidden className={ICON} />
            <Input
              id="password"
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`${FIELD} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="absolute right-1.5 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {showPwd ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-destructive px-3.5 py-2.5 text-sm text-destructive-foreground">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={submitting} className="mt-1 h-12 w-full rounded-xl text-[15px]">
          {submitting ? 'Connexion…' : (<>Se connecter <ArrowRight className="size-4" /></>)}
        </Button>
      </form>
    </AuthLayout>
  );
}
