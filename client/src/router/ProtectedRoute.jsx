import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Spinner from '../components/ui/Spinner';

// Blocks unauthenticated users; shows spinner while session is being restored
export function ProtectedRoute() {
  const { isAuthenticated, initializing } = useSelector((s) => s.auth);

  if (initializing) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner size="lg" className="text-primary-600" />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

// Blocks users without required role(s)
export function RoleRoute({ roles }) {
  const user = useSelector((s) => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
