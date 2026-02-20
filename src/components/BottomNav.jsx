import { NavLink } from 'react-router-dom';
import './BottomNav.css';

function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Home</span>
      </NavLink>
      
      <NavLink to="/add" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">➕</span>
        <span className="nav-label">Add</span>
      </NavLink>
      
      <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">📝</span>
        <span className="nav-label">History</span>
      </NavLink>
      
      <NavLink to="/analytics" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">📊</span>
        <span className="nav-label">Analytics</span>
      </NavLink>
    </nav>
  );
}

export default BottomNav;