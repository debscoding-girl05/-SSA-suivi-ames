import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HeartHandshake, Eye, EyeOff, ShieldCheck, Users, BellRing } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

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
    <main className="min-h-screen bg-app lg:grid lg:grid-cols-2">
      {/* Panneau de marque (desktop) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary-gradient p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 size-80 rounded-full bg-black/10 blur-2xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <HeartHandshake className="size-5" />
          </div>
          <span className="font-semibold">Suivi des Âmes</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Suivez chaque âme.<br />Ne perdez personne de vue.
          </h2>
          <p className="mt-3 text-sm text-white/80">
            Le suivi pastoral de la Cathédrale des Signes et Prodiges, centralisé et en temps réel.
          </p>
          <ul className="mt-6 flex flex-col gap-3 text-sm">
            <li className="flex items-center gap-3"><Users className="size-4 text-white/80" /> Dirigeants, départements & assignés</li>
            <li className="flex items-center gap-3"><BellRing className="size-4 text-white/80" /> Rapports hebdomadaires & relances</li>
            <li className="flex items-center gap-3"><ShieldCheck className="size-4 text-white/80" /> Accès sécurisé par rôle</li>
          </ul>
        </div>

        <p className="relative text-xs text-white/60">Cathédrale des Signes et Prodiges · Yaoundé</p>
      </div>

      {/* Formulaire */}
      <div className="flex min-h-screen items-center justify-center px-6 py-10 lg:min-h-0">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-primary">
              <HeartHandshake className="size-7" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Suivi des Âmes</h1>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-7">
            <h1 className="text-xl font-semibold tracking-tight">Connexion</h1>
            <p className="mt-1 text-sm text-muted-foreground">Accédez à votre espace de suivi.</p>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="identifier" className="text-sm font-medium">Email ou téléphone</label>
                <Input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="vous@ssa.app ou +237…"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">Mot de passe</label>
                  <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Mot de passe oublié ?</Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
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
              </div>

              {error && (
                <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" disabled={submitting} className="mt-1 w-full shadow-primary">
                {submitting ? 'Connexion…' : 'Se connecter'}
              </Button>
            </form>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Démo : <span className="font-medium text-foreground">pasteur@ssa.app</span> / pasteur1234
          </p>
        </div>
      </div>
    </main>
  );
}
