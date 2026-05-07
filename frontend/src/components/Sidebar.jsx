// ── FABIAN (ORIGINAL – Basis) + ARI (Icons + Funktionalität) ─────────────
//
// [MERGE: Claude] Fabian's Sidebar.jsx als visuelle Basis (HSMW-Logo,
// "bttrhsmw"-Branding, Open-Sans-Schrift). Ari's Funktionalität komplett
// erhalten: Emoji-Icons vor den Nav-Links, useLocation, alle NavLink-Props.
// Änderungen gegenüber Fabian's Original:
//   - span className="nav-icon" wieder eingefügt (Ari)
//   - Dashboard-Link hat wieder das 🏠-Icon (Ari)
//   - "Modul hinzufügen"-Link hat wieder das ➕-Icon (Ari)
// ──────────────────────────────────────────────────────────────────────────

import { NavLink, Link, useLocation } from "react-router-dom";

export default function Sidebar({ modules }) {
  const location = useLocation();   // Ari – wird für zukünftige aktive-State-Logik gebraucht

  return (
    <aside className="sidebar">
      {/* ── FABIAN: Logo-Bereich mit HSMW-Branding ─────────────────── */}
      <div className="sidebar-logo">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* FABIAN: HSMW-Logo-Bild (liegt in /public/hsmw-logo.png) */}
            <img
              src="/hsmw-logo.png"
              alt="HSMW Logo"
              style={{ width: "40px", height: "auto" }}
            />
            {/* FABIAN: "bttrhsmw"-Branding */}
            <span
              style={{
                fontFamily: "'Open Sans', sans-serif",
                color: "#2596be",
                fontWeight: "700",
                fontSize: "18px",
              }}
            >
              bttrhsmw
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="sidebar-logo-title">Campus-Portal</div>
            <div className="sidebar-logo-sub">HS Mittweida</div>
          </div>
        </div>
      </div>

      {/* ── ARI: Navigation ─────────────────────────────────────────── */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Übersicht</div>
        <NavLink
          to="/"
          end
          className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
        >
          {/* [MERGE: Claude] Icon wieder eingefügt (Ari) – Fabian hatte es entfernt */}
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
          {/* [MERGE: Claude] Icon wieder eingefügt (Ari) */}
          <span className="nav-icon">➕</span> Modul hinzufügen
        </NavLink>
      </nav>

      {/* ── FABIAN + ARI: Admin-Button ──────────────────────────────── */}
      <div className="sidebar-footer">
        <Link to="/admin" className="admin-btn">
          <span>🔐</span>
          <span>Admin Login</span>
        </Link>
      </div>
    </aside>
  );
}
