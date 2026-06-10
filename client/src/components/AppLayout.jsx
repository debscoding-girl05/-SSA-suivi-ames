import { Outlet } from 'react-router-dom';
import Sidebar from './layout/Sidebar';
import BottomNav from './layout/BottomNav';
import TopBar from './layout/TopBar';

// Responsive shell: sidebar on desktop (≥ md), bottom tab bar + top bar on mobile.
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-app">
      <Sidebar />
      <TopBar />

      <main className="md:pl-64">
        {/* Contenu collé à la sidebar (peu de marge), pleine largeur */}
        <div className="w-full px-4 py-5 pb-24 md:px-6 md:py-6 md:pb-8">
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
