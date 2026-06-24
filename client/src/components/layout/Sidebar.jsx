import { NavLink } from 'react-router-dom';
import {
  HiHome, HiClock, HiCalendar, HiUsers, HiOfficeBuilding,
  HiChartBar, HiUser, HiLogout,
} from 'react-icons/hi';
import useAuth from '../../hooks/useAuth';
import { fmtName } from '../../utils/formatters';
import { ROLES } from '../../utils/constants';

const NAV = {
  [ROLES.ADMIN]: [
    { to: '/dashboard/admin',   icon: HiHome,           label: 'Dashboard'   },
    { to: '/attendance/manage', icon: HiClock,          label: 'Attendance'  },
    { to: '/leaves/manage',     icon: HiCalendar,       label: 'Leaves'      },
    { to: '/users',             icon: HiUsers,          label: 'Users'       },
    { to: '/departments',       icon: HiOfficeBuilding, label: 'Departments' },
    { to: '/reports',           icon: HiChartBar,       label: 'Reports'     },
  ],
  [ROLES.MANAGER]: [
    { to: '/dashboard/manager', icon: HiHome,     label: 'Dashboard'    },
    { to: '/attendance',        icon: HiClock,    label: 'My Attendance'},
    { to: '/attendance/manage', icon: HiUsers,    label: 'Team Attend.' },
    { to: '/leaves/manage',     icon: HiCalendar, label: 'Team Leaves'  },
    { to: '/reports',           icon: HiChartBar, label: 'Reports'      },
  ],
  [ROLES.EMPLOYEE]: [
    { to: '/dashboard/employee', icon: HiHome,     label: 'Dashboard'  },
    { to: '/attendance',         icon: HiClock,    label: 'Attendance' },
    { to: '/leaves/my',          icon: HiCalendar, label: 'My Leaves'  },
  ],
};

export default function Sidebar({ onClose }) {
  const { user, handleLogout } = useAuth();
  const links = NAV[user?.role] ?? [];
  const initials = fmtName(user?.name);

  return (
    <aside className="flex flex-col h-full bg-sidebar w-64 text-slate-300 select-none">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-lg">
            W
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">WorkTrack</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
               ${isActive
                 ? 'bg-primary-600 text-white'
                 : 'hover:bg-white/10 text-slate-400 hover:text-white'}`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Profile + Logout */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <NavLink
          to="/profile"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
             ${isActive ? 'bg-primary-600 text-white' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`
          }
        >
          <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-slate-400 text-xs truncate capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </NavLink>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <HiLogout className="w-5 h-5 flex-shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}
