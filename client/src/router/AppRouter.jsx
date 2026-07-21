import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/Login/LoginPage';
import ForgotPasswordPage from '../pages/ForgotPassword/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPassword/ResetPasswordPage';
import AcceptInvitationPage from '../pages/Invitation/AcceptInvitationPage';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import DirigeantsPage from '../pages/Dirigeants/DirigeantsPage';
import DirigeantDetailPage from '../pages/Dirigeants/DirigeantDetailPage';
import DepartementsPage from '../pages/Departements/DepartementsPage';
import AnnuairePage from '../pages/Annuaire/AnnuairePage';
import RapportsPage from '../pages/Rapports/RapportsPage';
import CellulesPage from '../pages/Cellules/CellulesPage';
import CelluleDetailPage from '../pages/Cellules/CelluleDetailPage';
import LeadersCellulePage from '../pages/Cellules/LeadersCellulePage';
import ReportsPage from '../pages/Reports/ReportsPage';
import NouveauxVenusPage from '../pages/NouveauxVenus/NouveauxVenusPage';
import NotificationsPage from '../pages/Notifications/NotificationsPage';
import ProfilePage from '../pages/Profile/ProfilePage';
import ConnexionsPage from '../pages/Connexions/ConnexionsPage';
import RapportsHebdoPage from '../pages/RapportsHebdo/RapportsHebdoPage';
import NotFoundPage from '../pages/NotFound/NotFoundPage';
import ProtectedRoute from '../components/ProtectedRoute';
import AppLayout from '../components/AppLayout';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/invitation/:token" element={<AcceptInvitationPage />} />

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
        <Route path="/nouveaux-venus" element={<NouveauxVenusPage />} />
        <Route path="/fiches" element={<RapportsPage />} />
        <Route path="/cellules" element={<CellulesPage />} />
        <Route path="/cellules/leaders" element={<LeadersCellulePage />} />
        <Route path="/cellules/:id" element={<CelluleDetailPage />} />
        <Route path="/rapports" element={<ReportsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/connexions" element={<ConnexionsPage />} />
        <Route path="/rapports-hebdo" element={<RapportsHebdoPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
