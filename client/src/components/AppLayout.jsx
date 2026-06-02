import { Outlet } from 'react-router-dom';
import Sidebar from './layout/Sidebar';
import BottomNav from './layout/BottomNav';
import TopBar from './layout/TopBar';

// Responsive shell: sidebar on desktop (≥ md), bottom tab bar + top bar on mobile.
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      <TopBar />

      <main className="md:pl-64">
        <div className="mx-auto max-w-4xl px-4 py-5 pb-24 md:py-8 md:pb-8">
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
