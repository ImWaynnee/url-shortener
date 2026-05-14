import { BackendStatusCard } from '@components/BackendStatusCard';
import { ProtectedRoute } from '@components/ProtectedRoute';
import { AuthCallbackPage } from '@pages/AuthCallbackPage';
import { DashboardPage } from '@pages/DashboardPage';
import { HomePage } from '@pages/HomePage';
import { LoginPage } from '@pages/LoginPage';
import { MissingLinkPage } from '@pages/MissingLinkPage';
import { PreviewPage } from '@pages/PreviewPage';
import { RegisterPage } from '@pages/RegisterPage';
import { Navigate, Route, Routes } from 'react-router';

export default function App() {
  return (
    <>
      <BackendStatusCard />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/missing-link" element={<MissingLinkPage />} />
        <Route path="/preview/:code" element={<PreviewPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/home" element={<DashboardPage />} />
          <Route path="/dashboard/analytics" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard/home" replace />} />
      </Routes>
    </>
  );
}
