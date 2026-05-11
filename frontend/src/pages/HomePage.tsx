import { LoginBanner } from '@components/LoginBanner';
import UrlShortener from '@components/UrlShortener';
import { useAuth } from '@hooks/useAuth';
import { Navigate } from 'react-router';

export function HomePage() {
  const { user, isLoading } = useAuth();

  if (!isLoading && user) {
    return <Navigate to="/dashboard/home" replace />;
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {!user && <LoginBanner />}
      <UrlShortener />
    </main>
  );
}
