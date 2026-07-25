import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AdminGuard, AuthGuard } from './components/AuthGuard';
import { AUTH_REQUIRED_EVENT, isAuthenticated } from './auth/session';
import { AppSettingsPage } from './pages/AppSettings';
import { ContentPage } from './pages/Content';
import { FeedbackPage } from './pages/Feedback';
import { ForgotPasswordPage } from './pages/ForgotPassword';
import { LoginPage } from './pages/Login';
import { EmailProviderSettingsPage } from './pages/EmailProviderSettings';
import { LetterTemplateSettingsPage } from './pages/LetterTemplateSettings';
import { QueuePage } from './pages/Queue';
import { GeneratePage } from './pages/Generate';
import { ProfilePage } from './pages/Profile';
import { RequestDetailPage } from './pages/RequestDetail';
import { ResetPasswordPage } from './pages/ResetPassword';
import { UserSettingsPage } from './pages/UserSettings';

export function AppRoutes() {
  return (
    <>
      <AuthRequiredRedirect />
      <Routes>
        <Route
          path="/"
          element={isAuthenticated() ? <Navigate to="/requests" replace /> : <Navigate to="/login" replace />}
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<AuthGuard />}>
          <Route path="/requests" element={<QueuePage />} />
          <Route path="/requests/:id" element={<RequestDetailPage />} />
          <Route path="/requests/:id/generate" element={<GeneratePage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/content" element={<Navigate to="/content/banners" replace />} />
          <Route path="/content/:tab" element={<ContentPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route element={<AdminGuard />}>
          <Route path="/settings/email-provider" element={<EmailProviderSettingsPage />} />
          <Route path="/settings/letters" element={<LetterTemplateSettingsPage />} />
          <Route path="/settings/app" element={<AppSettingsPage />} />
          <Route path="/settings/users" element={<UserSettingsPage />} />
        </Route>
      </Routes>
    </>
  );
}

function AuthRequiredRedirect() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    function onAuthRequired() {
      queryClient.clear();
      navigate('/login', {
        replace: true,
        state: { reason: 'auth-required' },
      });
    }

    window.addEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
  }, [navigate, queryClient]);

  return null;
}
