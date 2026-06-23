import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export function RequireAuth() {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
