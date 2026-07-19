import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from './useSession';

export function RequireAuth() {
  const { session, loading } = useSession();
  const location = useLocation();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Cargando…</div>;
  }

  if (!session) {
    return <Navigate to="/staff/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
