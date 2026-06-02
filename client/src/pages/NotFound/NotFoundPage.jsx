import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 px-4">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-muted-foreground">Page introuvable.</p>
      <Link to="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
