import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import { isAuthenticated } from './auth/session';
import { ForgotPasswordPage } from './pages/ForgotPassword';
import { LoginPage } from './pages/Login';
import { EmailProviderSettingsPage } from './pages/EmailProviderSettings';
import { QueuePage } from './pages/Queue';
import { GeneratePage } from './pages/Generate';
import { RequestDetailPage } from './pages/RequestDetail';
import { ResetPasswordPage } from './pages/ResetPassword';

export function AppRoutes() {
  return (
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
        <Route path="/settings/email-provider" element={<EmailProviderSettingsPage />} />
      </Route>
    </Routes>
  );
}
