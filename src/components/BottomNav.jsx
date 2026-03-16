import { NavLink, useLocation } from 'react-router-dom';
import { Home, PlusCircle, Clock, BarChart2, Settings } from 'lucide-react';
import './BottomNav.css';

const NAV_ITEMS = [
  { to: '/',          label: 'Home',      Icon: Home      },
  { to: '/add',       label: 'Tambah',    Icon: PlusCircle },
  { to: '/history',   label: 'Riwayat',   Icon: Clock     },
  { to: '/analytics', label: 'Analitik',  Icon: BarChart2 },
  { to: '/settings',  label: 'Pengaturan',Icon: Settings   },
];

function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const isActive = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to);

          return (
            <NavLink
              key={to}
              to={to}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon-wrap">
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                {isActive && <span className="nav-active-dot" />}
              </span>
              <span className="nav-label">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
