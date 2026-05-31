// ── FABIAN: Neue Navigationsleiste ───────────────────────────────────────
// Ersetzt die alte Sidebar. Zeigt Logo, Module als Links,
// Admin-Button und Modul-hinzufügen-Button.
// ──────────────────────────────────────────────────────────────────────────

import { NavLink, Link, useLocation } from "react-router-dom";

export default function Navbar({ modules }) {
  // ── ARI: Admin-Dashboard-Link nur zeigen, wenn eingeloggt (Token vorhanden).
  //         useLocation() sorgt dafuer, dass nach Login/Logout neu ausgewertet wird,
  //         damit der Link sofort auftaucht bzw. wieder verschwindet.
  useLocation();
  let istEingeloggt = false;
  try { istEingeloggt = !!sessionStorage.getItem("token"); } catch { /* noop */ }

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
        {/* ── ARI: eingeloggt → direkt zum Admin-Dashboard, sonst → Login ── */}
        {istEingeloggt ? (
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              "navbar-pill navbar-pill-admin" + (isActive ? " active" : "")
            }
          >
            Admin-Dashboard
          </NavLink>
        ) : (
          <Link to="/admin" className="navbar-pill">Admin</Link>
        )}
      </div>
    </nav>
  );
}