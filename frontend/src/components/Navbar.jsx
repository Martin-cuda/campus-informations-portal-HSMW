// ── Navbar: Logo + Tab-Leiste in einer Zeile + Theme-Toggle ──
import { NavLink, Link } from "react-router-dom";

export default function Navbar({ modules, isAdmin, theme, onToggleTheme }) {
  return (
    <nav className="navbar-tabs">
      <Link to="/" className="navbar-logo">
        <img src="/hsmw-logo.png" alt="HSMW Logo" style={{ height: "22px", width: "auto" }} />
        <span className="navbar-logo-text">bttrhsmw</span>
      </Link>

      <span className="navbar-tabs-divider" />

      <NavLink to="/" end className={({ isActive }) => "navbar-tab" + (isActive ? " active" : "")}>
        Startseite
      </NavLink>
      {modules.map((mod) => (
        <NavLink
          key={mod.id}
          to={mod.path}
          className={({ isActive }) => "navbar-tab" + (isActive ? " active" : "")}
        >
          {mod.label}
        </NavLink>
      ))}

      <span className="navbar-tabs-spacer" />

      <button
        type="button"
        className="theme-toggle"
        onClick={onToggleTheme}
        title={theme === "dark" ? "Zu Light Mode wechseln" : "Zu Dark Mode wechseln"}
        aria-label="Theme umschalten"
      >
        {theme === "dark" ? (
          // Sonne-Icon (zeigt an: Klick wechselt zu Light)
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
            <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
            <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
          </svg>
        ) : (
          // Mond-Icon (zeigt an: Klick wechselt zu Dark)
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        )}
      </button>

      {isAdmin && (
        <>
          <Link to="/module-add" className="navbar-pill">+ Modul</Link>
          <Link to="/admin" className="navbar-pill">Admin</Link>
        </>
      )}
      {!isAdmin && (
        <Link to="/admin" className="navbar-pill navbar-pill-ghost">Admin</Link>
      )}
    </nav>
  );
}