import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";

export default function Sidebar({ modules }) {
  const location = useLocation();
  const navigate = useNavigate();

  const token = sessionStorage.getItem("token");

  // JWT manuell dekodieren (ohne externe library)
  let username = null;

  if (token && token !== "demo-token") {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(atob(base64));
      username = decoded.sub;
    } catch (err) {
      console.log("Token konnte nicht gelesen werden");
    }
  }

  if (token === "demo-token") {
    username = "Demo-Admin";
  }

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("token_type");
    navigate("/admin");
  };

  return (
    <aside className="sidebar">

      {/* ── LOGO ───────────────────────────── */}
      <div className="sidebar-logo">
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            textDecoration: "none",
          }}
        >
          <img
            src="/hsmw-logo.png"
            alt="HSMW Logo"
            style={{ width: "40px", height: "auto" }}
          />

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
        </Link>
      </div>

      {/* ── NAVIGATION ─────────────────────── */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Übersicht</div>

        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            "nav-item" + (isActive ? " active" : "")
          }
        >
          Dashboard
        </NavLink>

        <div className="nav-section-label">Module</div>

        {modules.map((mod) => (
          <NavLink
            key={mod.id}
            to={mod.path}
            className={({ isActive }) =>
              "nav-item" + (isActive ? " active" : "")
            }
          >
            <span className="nav-icon">{mod.icon}</span>
            {mod.label}
          </NavLink>
        ))}

        <NavLink
          to="/module-add"
          className={({ isActive }) =>
            "nav-item" + (isActive ? " active" : "")
          }
        >
          Modul hinzufügen
        </NavLink>
      </nav>

      {/* ── FOOTER / LOGIN STATUS ─────────── */}
      <div className="sidebar-footer">

        {username ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "13px", opacity: 0.8 }}>
              👤 Angemeldet als: <b>{username}</b>
            </div>

            <button
              onClick={logout}
              className="admin-btn"
              style={{ cursor: "pointer" }}
            >
              Abmelden
            </button>
          </div>
        ) : (
          <Link to="/admin" className="admin-btn">
            Admin Login
          </Link>
        )}

      </div>
    </aside>
  );
}
