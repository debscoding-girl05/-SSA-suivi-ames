import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/Login/LoginPage';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import MembersPage from '../pages/Members/MembersPage';
import SheetsPage from '../pages/Sheets/SheetsPage';
import StatsPage from '../pages/Stats/StatsPage';
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
        <Route path="/members" element={<MembersPage />} />
        <Route path="/sheets" element={<SheetsPage />} />
        <Route
          path="/stats"
          element={
            <ProtectedRoute roles={['admin', 'leader']}>
              <StatsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
