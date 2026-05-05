import { Link } from "react-router-dom";

const STATUS_CARDS = [
  { icon: "🖥", label: "Backend API", value: "Online", color: "#22c55e" },
  { icon: "📅", label: "Semester", value: "SS 2025", color: "#3b82f6" },
  { icon: "👥", label: "Team", value: "4 Personen", color: "#8b5cf6" },
  { icon: "🔖", label: "Version", value: "v0.1.0", color: "#f59e0b" },
];

export default function Dashboard({ modules }) {
  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">Campus-Informationsportal · HS Mittweida · Informatik II</div>
      </div>

      {/* Status Row */}
      <div className="card-grid" style={{ marginBottom: 28 }}>
        {STATUS_CARDS.map((c, i) => (
          <div className="status-card fade-up" key={c.label}>
            <div className="status-card-icon">{c.icon}</div>
            <div className="status-card-label">{c.label}</div>
            <div className="status-card-value" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Module Grid */}
      <div className="card fade-up">
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>Aktive Module</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
            Klicke ein Modul um es zu öffnen
          </div>
        </div>
        <div className="card-grid">
          {modules.map((mod) => (
            <Link
              to={mod.path}
              key={mod.id}
              className="status-card fade-up"
              style={{ textDecoration: "none" }}
            >
              <div className="status-card-icon">{mod.icon}</div>
              <div className="status-card-label">Modul</div>
              <div className="status-card-value" style={{ fontSize: 16 }}>{mod.label}</div>
            </Link>
          ))}

          {/* Add Module Card */}
          <Link to="/module-add" className="add-module-card">
            <div className="add-module-plus">+</div>
            <div className="add-module-label">Modul hinzufügen</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
