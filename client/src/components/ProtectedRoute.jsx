import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { WifiOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../hooks/useAuth';
import BrandLogo from './BrandLogo';

// Écran de démarrage pendant la vérification de la session. Sur un réseau
// mobile lent, on explique ce qui se passe au lieu d'un « Chargement… » muet.
function StartupScreen({ offline, onRetry }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-app px-6 text-center">
      <BrandLogo className="size-20" />
      {offline ? (
        <>
          <p className="flex items-center gap-2 text-base font-semibold"><WifiOff className="size-5 text-destructive-dark" /> Serveur injoignable</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Votre connexion internet semble coupée ou trop faible. Vérifiez vos données mobiles ou le Wi-Fi, puis réessayez.
          </p>
          <Button onClick={onRetry}><RotateCcw className="size-4" /> Réessayer</Button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-muted-foreground" role="status">Ouverture de votre espace…</p>
          {slow && <p className="max-w-xs text-xs text-muted-foreground">Le réseau est lent, merci de patienter quelques secondes.</p>}
        </>
      )}
    </div>
  );
}

// Guards routes that require authentication. Redirects to /login otherwise.
// Optional `roles` prop restricts access by user role.
export default function ProtectedRoute({ children, roles }) {
  const { user, status, retry } = useAuth();
  const location = useLocation();

  if (status === 'loading' || status === 'offline') {
    return <StartupScreen offline={status === 'offline'} onRetry={retry} />;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
