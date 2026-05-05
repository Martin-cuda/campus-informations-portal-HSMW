import { NavLink, Link, useLocation } from "react-router-dom";

export default function Sidebar({ modules }) {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-title">Campus-Portal</div>
        <div className="sidebar-logo-sub">HS Mittweida</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Übersicht</div>
        <NavLink to="/" end className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
          <span className="nav-icon">🏠</span> Dashboard
        </NavLink>

        <div className="nav-section-label">Module</div>
        {modules.map((mod) => (
          <NavLink
            key={mod.id}
            to={mod.path}
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
          >
            <span className="nav-icon">{mod.icon}</span> {mod.label}
          </NavLink>
        ))}

        <NavLink
          to="/module-add"
          className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
        >
          <span className="nav-icon">➕</span> Modul hinzufügen
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <Link to="/admin" className="admin-btn">
          <span>🔐</span>
          <span>Admin Login</span>
        </Link>
      </div>
    </aside>
  );
}
