import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute, RoleRoute } from './ProtectedRoute';

import DashboardLayout from '../layouts/DashboardLayout';

import LoginPage           from '../pages/auth/LoginPage';
import AdminDashboard      from '../pages/dashboard/AdminDashboard';
import ManagerDashboard    from '../pages/dashboard/ManagerDashboard';
import EmployeeDashboard   from '../pages/dashboard/EmployeeDashboard';
import AttendancePage      from '../pages/attendance/AttendancePage';
import ManageAttendancePage from '../pages/attendance/ManageAttendancePage';
import MyLeavesPage        from '../pages/leave/MyLeavesPage';
import ManageLeavesPage    from '../pages/leave/ManageLeavesPage';
import UsersPage           from '../pages/users/UsersPage';
import DepartmentsPage     from '../pages/departments/DepartmentsPage';
import ReportsPage         from '../pages/reports/ReportsPage';
import ProfilePage         from '../pages/profile/ProfilePage';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          // Role-specific dashboards
          { element: <RoleRoute roles={['ADMIN']} />,    children: [{ path: '/dashboard/admin',   element: <AdminDashboard /> }] },
          { element: <RoleRoute roles={['MANAGER']} />,  children: [{ path: '/dashboard/manager', element: <ManagerDashboard /> }] },
          { element: <RoleRoute roles={['EMPLOYEE']} />, children: [{ path: '/dashboard/employee', element: <EmployeeDashboard /> }] },

          // Attendance
          { path: '/attendance',        element: <AttendancePage /> },
          { element: <RoleRoute roles={['ADMIN', 'MANAGER']} />, children: [
            { path: '/attendance/manage', element: <ManageAttendancePage /> },
          ]},

          // Leaves
          { path: '/leaves/my',         element: <MyLeavesPage /> },
          { element: <RoleRoute roles={['ADMIN', 'MANAGER']} />, children: [
            { path: '/leaves/manage', element: <ManageLeavesPage /> },
          ]},

          // Admin only
          { element: <RoleRoute roles={['ADMIN']} />, children: [
            { path: '/users',       element: <UsersPage /> },
            { path: '/departments', element: <DepartmentsPage /> },
          ]},

          // Reports (Admin + Manager)
          { element: <RoleRoute roles={['ADMIN', 'MANAGER']} />, children: [
            { path: '/reports', element: <ReportsPage /> },
          ]},

          // All roles
          { path: '/profile', element: <ProfilePage /> },

          // Default redirect
          { path: '/',        element: <DashboardRedirect /> },
          { path: '/dashboard', element: <DashboardRedirect /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" /> },
]);

import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
function DashboardRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const map = { ADMIN: '/dashboard/admin', MANAGER: '/dashboard/manager', EMPLOYEE: '/dashboard/employee' };
  return <Navigate to={map[user.role] || '/login'} replace />;
}

export default router;
