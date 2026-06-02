import { Link } from 'react-router-dom';
import { HeartHandshake } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

// Mobile top bar (visible < md): brand + avatar shortcut to profile.
export default function TopBar() {
  const { user } = useAuth();
  const initials = (user?.fullName || user?.email || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md md:hidden">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HeartHandshake className="size-4" />
        </div>
        <span className="text-sm font-medium">Suivi des Âmes</span>
      </div>
      <Link
        to="/profile"
        aria-label="Profil"
        className="flex size-8 items-center justify-center rounded-full bg-primary-transparent text-xs font-medium text-primary"
      >
        {initials}
      </Link>
    </header>
  );
}
