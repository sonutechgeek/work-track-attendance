import { useSelector, useDispatch } from 'react-redux';
import { logoutAsync } from '../store/slices/auth.slice';
import { ROLES } from '../utils/constants';

function useAuth() {
  const dispatch = useDispatch();
  const { user, isAuthenticated, loading } = useSelector((s) => s.auth);

  const isAdmin    = user?.role === ROLES.ADMIN;
  const isManager  = user?.role === ROLES.MANAGER;
  const isEmployee = user?.role === ROLES.EMPLOYEE;

  const handleLogout = () => dispatch(logoutAsync());

  return { user, isAuthenticated, loading, isAdmin, isManager, isEmployee, handleLogout };
}

// Named + default export so both import styles work
export { useAuth };
export default useAuth;
