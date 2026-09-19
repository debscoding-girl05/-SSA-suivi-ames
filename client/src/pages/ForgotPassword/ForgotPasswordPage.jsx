import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MailCheck } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';
import { forgotPassword } from '../../api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await forgotPassword(email);
      // Réponse volontairement générique côté serveur (même si l'email
      // n'existe pas) — on affiche donc toujours ce message de succès.
      setSent(true);
    } catch (err) {
      setError(err?.message || "Impossible d'envoyer l'email pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
        {sent ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="size-6" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Email envoyé</h1>
            <p className="text-sm text-muted-foreground">
              Si un compte existe pour <strong className="text-foreground">{email}</strong>, un lien de
              réinitialisation vient de lui être envoyé. Vérifiez la boîte de réception (et les spams).
            </p>
            <Link to="/login" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              <ArrowLeft className="size-3.5" /> Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold tracking-tight">Mot de passe oublié</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Indiquez votre email, nous vous envoyons un lien pour choisir un nouveau mot de passe.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="vous@ssa.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {error && <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">{error}</p>}

              <Button type="submit" size="lg" disabled={submitting} className="mt-1 w-full shadow-primary">
                {submitting ? 'Envoi…' : 'Envoyer le lien'}
              </Button>

              <Link to="/login" className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-3.5" /> Retour à la connexion
              </Link>
            </form>
          </>
        )}
    </AuthLayout>
  );
}
