import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BottomNav from './BottomNav';
import AIAdvisorWidget from './AIAdvisorWidget';

function ProtectedRoute() {
  const { user, loading, onboardingCompleted } = useAuth();
  const location = useLocation();

  // Show spinner while waiting for auth session restore OR onboarding status check
  if (loading || (user && onboardingCompleted === null)) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isOnboarding = location.pathname === '/onboarding';

  // Redirect to onboarding if not yet completed
  if (!onboardingCompleted && !isOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  // Redirect away from onboarding if already completed
  if (onboardingCompleted && isOnboarding) {
    return <Navigate to="/" replace />;
  }

  // On the onboarding page: render without shell chrome
  if (isOnboarding) {
    return <Outlet />;
  }

  return (
    <>
      <Outlet />
      <BottomNav />
      <AIAdvisorWidget />
    </>
  );
}

export default ProtectedRoute;
