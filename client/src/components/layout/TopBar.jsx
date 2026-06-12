import { Link } from 'react-router-dom';
import { HeartHandshake } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '@/components/ui/avatar';
import { NotificationBell } from '../NotificationBell';

// Mobile top bar (visible < md): brand + avatar shortcut to profile.
export default function TopBar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/85 px-4 py-3 backdrop-blur-md md:hidden">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary-gradient text-primary-foreground shadow-primary">
          <HeartHandshake className="size-4" />
        </div>
        <span className="text-sm font-semibold">Suivi des Âmes</span>
      </div>
      <div className="flex items-center gap-1">
        <NotificationBell />
        <Link to="/profile" aria-label="Profil" className="rounded-full">
          <Avatar name={user?.fullName || user?.email} size="sm" />
        </Link>
      </div>
    </header>
  );
}
