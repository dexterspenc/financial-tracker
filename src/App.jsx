import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AIChatProvider } from './contexts/AIChatContext';
import ProtectedRoute from './components/ProtectedRoute';
import { DataProvider } from './contexts/DataContext';
import HomePage from './pages/HomePage';
import { Toaster } from './components/ui/Toast';
import './App.css';

// Lazy-load non-landing routes so heavy deps (Chart.js, tremor) stay out of the initial bundle
const AddPage = lazy(() => import('./pages/AddPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));

function RouteFallback() {
  return (
    <div className="loading-state" style={{ minHeight: '60vh' }}>
      <div className="loading-spinner" />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />

              {/* Protected routes — ProtectedRoute renders Outlet + BottomNav + AIAdvisorWidget */}
              <Route element={<DataProvider><AIChatProvider><ProtectedRoute /></AIChatProvider></DataProvider>}>
                <Route path="/" element={<HomePage />} />
                <Route path="/add" element={<AddPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
              </Route>
            </Routes>
          </Suspense>
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
