// ──────────────────────────────────────────────────────────────────────────
// Dashboard.jsx
// Startseite der App. Zeigt oben Status-Karten (Backend, Semester, Team, Version)
// und darunter ein Grid mit allen aktiven Modulen plus einer "+"-Kachel zum
// Hinzufügen. Auf eigenen Modulen erscheinen beim Hover Stift- und X-Buttons.
// ──────────────────────────────────────────────────────────────────────────

// Link für Navigation per Klick (innerer App-Link, kein Reload)
// useNavigate für programmatisches Navigieren beim Klick auf "Bearbeiten"
import { Link, useNavigate } from "react-router-dom";

// Statische Status-Kacheln oben auf dem Dashboard – reine Anzeige, keine Logik.
// Werden in einer Reihe gerendert mit jeweils Icon, Label, Wert und farbigem Wert.
const STATUS_CARDS = [
  { icon: "🖥", label: "Backend API", value: "Online", color: "#22c55e" },
  { icon: "📅", label: "Semester", value: "SS 2025", color: "#3b82f6" },
  { icon: "👥", label: "Team", value: "4 Personen", color: "#8b5cf6" },
  { icon: "🔖", label: "Version", value: "v0.1.0", color: "#f59e0b" },
];

// Module die fest verbaut sind und nicht über die UI entfernt werden dürfen.
// Bei diesen wird das ✕-Icon nicht eingeblendet.
const CORE_IDS = new Set(["mensa", "news"]);

// Nur "eigene" Module (id startet mit "custom-") sind editierbar – die vorgefertigten
// (Stundenplan, Raumplan, Kontakt, …) haben keinen freien Inhalt zum Bearbeiten.
function isEditable(mod) {
  return typeof mod?.id === "string" && mod.id.startsWith("custom-");
}

// Props: modules (Liste aller Module die angezeigt werden sollen),
//        onRemove (Callback der vom X-Button aufgerufen wird).
//        loaded ist optional und wird aktuell nicht visuell genutzt.
export default function Dashboard({ modules, onRemove }) {
  // useNavigate gibt eine Funktion zurück mit der wir programmatisch
  // zur Bearbeiten-Seite springen können.
  const navigate = useNavigate();

  // Klick auf das X-Icon → User fragen ob wirklich, dann Callback aufrufen.
  // preventDefault + stopPropagation sind wichtig, damit der umschließende
  // <Link> nicht auch noch navigiert (sonst würde nach dem Bestätigen
  // die Modul-Detailseite aufgemacht).
  const handleRemove = (e, mod) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof onRemove !== "function") return;
    const ok = window.confirm(`Modul "${mod.label}" wirklich entfernen?\nDas wirkt für alle User des Portals.`);
    if (ok) onRemove(mod.id);
  };

  // Klick auf das Stift-Icon → zur ModuleAdd-Seite navigieren und das
  // ganze Modul-Objekt im Router-State mitgeben. ModuleAdd erkennt den
  // Edit-Modus daran und füllt das Formular vor.
  const handleEdit = (e, mod) => {
    e.preventDefault();
    e.stopPropagation();
    navigate("/module-add", { state: { editingModule: mod } });
  };

  return (
    <div>
      {/* Page-Header oben mit Titel und Untertitel */}
      <div className="page-header fade-up">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">Campus-Informationsportal · HS Mittweida · Informatik II</div>
      </div>

      {/* Status Row: vier kleine Karten in einem Grid */}
      <div className="card-grid" style={{ marginBottom: 28 }}>
        {STATUS_CARDS.map((c) => (
          <div className="status-card fade-up" key={c.label}>
            <div className="status-card-icon">{c.icon}</div>
            <div className="status-card-label">{c.label}</div>
            <div className="status-card-value" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Module Grid – die eigentliche Aktion auf dem Dashboard */}
      <div className="card fade-up">
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>Aktive Module</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
            Klicke ein Modul um es zu öffnen · "+" um eines hinzuzufügen
          </div>
        </div>
        <div className="card-grid">
          {/* Eine Kachel pro Modul */}
          {modules.map((mod) => {
            const removable = !CORE_IDS.has(mod.id);  // Mensa/News kann nicht weg
            const editable  = isEditable(mod);         // nur custom-* sind editierbar
            return (
              // Die ganze Kachel ist ein <Link>, also Klick = Modul öffnen
              <Link
                to={mod.path}
                key={mod.id}
                className="status-card module-tile fade-up"
                style={{ textDecoration: "none", position: "relative" }}
              >
                {/* Stift-Button oben rechts (etwas weiter nach links versetzt
                    damit X und Stift nebeneinander sitzen) */}
                {editable && (
                  <button
                    type="button"
                    className="module-tile-edit"
                    onClick={(e) => handleEdit(e, mod)}
                    title={`${mod.label} bearbeiten`}
                    aria-label={`${mod.label} bearbeiten`}
                  >
                    ✎
                  </button>
                )}
                {/* X-Button oben rechts – erscheint nur beim Hover */}
                {removable && (
                  <button
                    type="button"
                    className="module-tile-remove"
                    onClick={(e) => handleRemove(e, mod)}
                    title={`${mod.label} entfernen`}
                    aria-label={`${mod.label} entfernen`}
                  >
                    ×
                  </button>
                )}
                {/* Eigentlicher Karten-Inhalt: Icon + Label */}
                <div className="status-card-icon">{mod.icon}</div>
                <div className="status-card-label">Modul</div>
                <div className="status-card-value" style={{ fontSize: 16 }}>{mod.label}</div>
              </Link>
            );
          })}

          {/* "+"-Kachel am Ende des Rasters → Modul hinzufügen */}
          <Link to="/module-add" className="add-module-card">
            <div className="add-module-plus">+</div>
            <div className="add-module-label">Modul hinzufügen</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
