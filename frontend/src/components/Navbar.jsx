// ── FABIAN: Neue Navigationsleiste ───────────────────────────────────────
// Ersetzt die alte Sidebar. Zeigt Logo, Module als Links,
// Admin-Button und Modul-hinzufügen-Button.
// ──────────────────────────────────────────────────────────────────────────

import { NavLink, Link } from "react-router-dom";

export default function Navbar({ modules }) {
  return (
    <nav className="navbar">
      {/* ── Logo-Bereich ─────────────────────────────────────────────── */}
      <Link to="/" className="navbar-logo">
        <img src="/hsmw-logo.png" alt="HSMW Logo" style={{ height: "32px", width: "auto" }} />
        <span className="navbar-logo-text">bttrhsmw</span>
      </Link>

      {/* ── Module als Links ─────────────────────────────────────────── */}
      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}>
          Dashboard
        </NavLink>
        <NavLink to="/mensa" className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}>
          Mensa
        </NavLink>
        <NavLink to="/raumfinder" className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}>
          Raumfinder
        </NavLink>
        <NavLink to="/news" className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}>
          News
        </NavLink>
        <NavLink to="/kontakt" className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}>
          Kontakte
        </NavLink>
        {/* Dynamische extra Module */}
        {modules
          .filter((m) => !["mensa", "news", "raumfinder", "kontakt"].includes(m.id))
          .map((mod) => (
            <NavLink
              key={mod.id}
              to={mod.path}
              className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
            >
              {mod.label}
            </NavLink>
          ))}
      </div>

      {/* ── Rechte Seite: Modul hinzufügen + Admin ───────────────────── */}
      <div className="navbar-right">
        <Link to="/module-add" className="navbar-pill">+ Modul</Link>
        <Link to="/admin" className="navbar-pill">Admin</Link>
      </div>
    </nav>
  );
}