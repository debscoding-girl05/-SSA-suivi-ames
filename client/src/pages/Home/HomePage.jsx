import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../../hooks/useAuth';

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-50 px-4">
      <h1 className="text-3xl font-bold text-violet-700">SSA — Suivi des Âmes</h1>
      <p className="text-neutral-500">
        Bienvenue{user?.fullName ? `, ${user.fullName}` : ''}.
      </p>
      {user?.role && <Badge>{user.role}</Badge>}
      <Button variant="outline" onClick={logout}>
        Se déconnecter
      </Button>
    </main>
  );
}
