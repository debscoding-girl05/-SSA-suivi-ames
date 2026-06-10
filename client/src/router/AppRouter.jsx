import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/Login/LoginPage';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import DirigeantsPage from '../pages/Dirigeants/DirigeantsPage';
import DirigeantDetailPage from '../pages/Dirigeants/DirigeantDetailPage';
import DepartementsPage from '../pages/Departements/DepartementsPage';
import AnnuairePage from '../pages/Annuaire/AnnuairePage';
import RapportsPage from '../pages/Rapports/RapportsPage';
import ReportsPage from '../pages/Reports/ReportsPage';
import ProfilePage from '../pages/Profile/ProfilePage';
import NotFoundPage from '../pages/NotFound/NotFoundPage';
import ProtectedRoute from '../components/ProtectedRoute';
import AppLayout from '../components/AppLayout';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated area with responsive sidebar / bottom nav */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dirigeants" element={<DirigeantsPage />} />
        <Route path="/dirigeants/:id" element={<DirigeantDetailPage />} />
        <Route path="/departements" element={<DepartementsPage />} />
        <Route path="/annuaire" element={<AnnuairePage />} />
        <Route path="/fiches" element={<RapportsPage />} />
        <Route path="/rapports" element={<ReportsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
