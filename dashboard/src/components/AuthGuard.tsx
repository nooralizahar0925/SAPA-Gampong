import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isAuthenticated, isSystemAdmin } from '../auth/session';

export function AuthGuard() {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function AdminGuard() {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isSystemAdmin()) {
    return <Navigate to="/requests" replace />;
  }

  return <Outlet />;
}
