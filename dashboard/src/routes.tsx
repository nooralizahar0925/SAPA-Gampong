import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AdminGuard, AuthGuard } from './components/AuthGuard';
import { AUTH_REQUIRED_EVENT } from './auth/session';
import { AppSettingsPage } from './pages/AppSettings';
import { ContentPage } from './pages/Content';
import { FeedbackPage } from './pages/Feedback';
import { ForgotPasswordPage } from './pages/ForgotPassword';
import { LoginPage } from './pages/Login';
import { EmailProviderSettingsPage } from './pages/EmailProviderSettings';
import { AppDistributionSettingsPage } from './pages/AppDistributionSettings';
import { LetterTemplateSettingsPage } from './pages/LetterTemplateSettings';
import { QueuePage } from './pages/Queue';
import { GeneratePage } from './pages/Generate';
import { ProfilePage } from './pages/Profile';
import { PrivacyPolicyPage } from './pages/PrivacyPolicy';
import { RequestDetailPage } from './pages/RequestDetail';
import { ResetPasswordPage } from './pages/ResetPassword';
import { StagingAppInstallPage } from './pages/StagingAppInstall';
import { DownloadPage } from './pages/Download';
import { UserSettingsPage } from './pages/UserSettings';

export function AppRoutes() {
  return (
    <>
      <AuthRequiredRedirect />
      <RouteRobotsMeta />
      <Routes>
        <Route path="/" element={<DownloadPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/download" element={<Navigate to="/" replace />} />
        <Route element={<AuthGuard />}>
          <Route path="/requests" element={<QueuePage />} />
          <Route path="/requests/:id" element={<RequestDetailPage />} />
          <Route path="/requests/:id/generate" element={<GeneratePage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/content" element={<Navigate to="/content/banners" replace />} />
          <Route path="/content/:tab" element={<ContentPage />} />
          <Route path="/staging-app" element={<StagingAppInstallPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route element={<AdminGuard />}>
          <Route path="/settings/email-provider" element={<EmailProviderSettingsPage />} />
          <Route path="/settings/letters" element={<LetterTemplateSettingsPage />} />
          <Route path="/settings/app" element={<AppSettingsPage />} />
          <Route path="/settings/distribution" element={<AppDistributionSettingsPage />} />
          <Route path="/settings/users" element={<UserSettingsPage />} />
        </Route>
      </Routes>
    </>
  );
}

function RouteRobotsMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const googlebot = document.querySelector<HTMLMetaElement>('meta[name="googlebot"]');
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const staging = import.meta.env.VITE_DEPLOY_ENV === 'staging';
    const publicPage = pathname === '/' || pathname === '/privacy-policy';
    const directive = !staging && publicPage
      ? 'index, follow, max-image-preview:large'
      : 'noindex, nofollow, noarchive';

    robots?.setAttribute('content', directive);
    googlebot?.setAttribute('content', directive);
    if (canonical && publicPage) {
      canonical.href = pathname === '/' ? `${window.location.origin}/` : `${window.location.origin}${pathname}`;
    }
  }, [pathname]);

  return null;
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
