import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-dot" />
        MenuMaster
      </Link>

      <div className="navbar-links">
        {user ? (
          <>
            <Link to="/recipes" className={`nav-link ${pathname === '/recipes' ? 'active' : ''}`}>
              Recipes
            </Link>
            <Link to="/calculator" className={`nav-link ${pathname === '/calculator' ? 'active' : ''}`}>
              Calculator
            </Link>
            <div className="nav-user">
              <div className="avatar" title={user.name}>{initials}</div>
              <span style={{ display: 'none' }}>{user.name}</span>
              <button className="logout-btn" onClick={handleLogout}>Sign out</button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Sign in</Link>
            <Link to="/register" className="nav-btn">Get started</Link>
          </>
        )}
      </div>
    </nav>
  );
}
