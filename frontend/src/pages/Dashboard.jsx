// ──────────────────────────────────────────────────────────────────────────
// Dashboard.jsx
// Startseite der App. Zeigt oben Status-Karten (Backend, Semester, Team, Version)
// und darunter ein Grid mit allen aktiven Modulen plus einer "+"-Kachel zum
// Hinzufügen. Auf eigenen Modulen erscheinen beim Hover Stift- und X-Buttons.
// ──────────────────────────────────────────────────────────────────────────

// Link für Navigation per Klick (innerer App-Link, kein Reload)
// useNavigate für programmatisches Navigieren beim Klick auf "Bearbeiten"
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

// Statische Status-Kacheln oben auf dem Dashboard – reine Anzeige, keine Logik.
// Werden in einer Reihe gerendert mit jeweils Icon, Label, Wert und farbigem Wert.
const STATUS_CARDS = [
  { icon: "", label: "Backend API", value: "Online", color: "#22c55e" },
  { icon: "", label: "Semester", value: "SS 2025", color: "#3b82f6" },
  { icon: "", label: "Team", value: "4 Personen", color: "#8b5cf6" },
  { icon: "", label: "Version", value: "v0.1.0", color: "#f59e0b" },
];

// Module die fest verbaut sind und nicht über die UI entfernt werden dürfen.
// Bei diesen wird das ✕-Icon nicht eingeblendet.
const CORE_IDS = new Set(["mensa", "news", "raumfinder", "kontakt"]);

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
  // ── Widget State ──────────────────────────────────────────────────────
  const [widgetDaten, setWidgetDaten] = useState({
    mensaGerichte: null,
    raeumeFreie: null,
    kontakteAnzahl: null,
  });

  useEffect(() => {
    const API = "http://localhost:8000";

    // Mensa: Anzahl Gerichte heute
    fetch(`${API}/api/mensa/heute`)
      .then((r) => r.json())
      .then((data) => {
        const anzahl = (data.kategorien || []).reduce(
          (sum, kat) => sum + (kat.menus || []).length, 0
        );
        setWidgetDaten((prev) => ({ ...prev, mensaGerichte: anzahl }));
      })
      .catch(() => setWidgetDaten((prev) => ({ ...prev, mensaGerichte: "–" })));

    // Raumfinder: Anzahl freier Räume
    fetch(`${API}/api/haeuser/`)
      .then((r) => r.json())
      .then((data) => {
        const freie = data.reduce(
          (sum, haus) => sum + (haus.raeume || []).filter((r) => !r.belegt).length, 0
        );
        setWidgetDaten((prev) => ({ ...prev, raeumeFreie: freie }));
      })
      .catch(() => setWidgetDaten((prev) => ({ ...prev, raeumeFreie: "–" })));

    // Kontakte: Anzahl Einträge
    fetch(`${API}/api/contacts/`)
      .then((r) => r.json())
      .then((data) => {
        setWidgetDaten((prev) => ({ ...prev, kontakteAnzahl: data.count }));
      })
      .catch(() => setWidgetDaten((prev) => ({ ...prev, kontakteAnzahl: "–" })));
  }, []);

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
      {/* Hero-Bereich mit Campus-Foto */}
      <div style={{
        position: "relative",
        height: "220px",
        marginBottom: "28px",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }} className="fade-up">
        {/* Campus-Foto als Hintergrundbild */}
        <img
          src="/Campusfoto.jpg"
          alt="Campus HS Mittweida"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Dunkler Overlay damit Text lesbar bleibt */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 100%)",
        }} />
        {/* Text über dem Bild */}
        <div style={{
          position: "absolute",
          bottom: "24px",
          left: "28px",
        }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#fff" }}>
            Campus-Informationsportal
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
            HS Mittweida · Willkommen
          </div>
        </div>
      </div>

      {/* Info-Widgets */}
      <div className="card-grid" style={{ marginBottom: 28 }}>
        <div className="status-card fade-up">
          <div style={{ width: "100%", height: 3, background: "#2596be", borderRadius: 2, marginBottom: 10 }} />
          <div className="status-card-label">Mensa</div>
          <div className="status-card-value" style={{ color: "#2596be" }}>
            {widgetDaten.mensaGerichte === null ? "..." : `${widgetDaten.mensaGerichte} Gerichte heute`}
          </div>
        </div>
        <div className="status-card fade-up">
          <div style={{ width: "100%", height: 3, background: "#22c55e", borderRadius: 2, marginBottom: 10 }} />
          <div className="status-card-label">Raumfinder</div>
          <div className="status-card-value" style={{ color: "#22c55e" }}>
            {widgetDaten.raeumeFreie === null ? "..." : `${widgetDaten.raeumeFreie} Räume frei`}
          </div>
        </div>
        <div className="status-card fade-up">
          <div style={{ width: "100%", height: 3, background: "#8b5cf6", borderRadius: 2, marginBottom: 10 }} />
          <div className="status-card-label">Kontakte</div>
          <div className="status-card-value" style={{ color: "#8b5cf6" }}>
            {widgetDaten.kontakteAnzahl === null ? "..." : `${widgetDaten.kontakteAnzahl} Einträge`}
          </div>
        </div>
      </div>

      {/* Module Grid – die eigentliche Aktion auf dem Dashboard */}
      {/* Schnellzugriff */}
      <div className="card fade-up" style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 14 }}>
          Schnellzugriff
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <Link to="/raumfinder" style={{ textDecoration: "none" }}>
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "var(--radius)", padding: "14px 16px", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#e0f2fe"}
              onMouseLeave={e => e.currentTarget.style.background = "#f0f9ff"}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0369a1" }}>Raum suchen</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Freie Räume finden</div>
            </div>
          </Link>
          <Link to="/mensa" style={{ textDecoration: "none" }}>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--radius)", padding: "14px 16px", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#dcfce7"}
              onMouseLeave={e => e.currentTarget.style.background = "#f0fdf4"}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>Speiseplan</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Mensaplan heute</div>
            </div>
          </Link>
          <Link to="/kontakt" style={{ textDecoration: "none" }}>
            <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "var(--radius)", padding: "14px 16px", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f3e8ff"}
              onMouseLeave={e => e.currentTarget.style.background = "#faf5ff"}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#7e22ce" }}>Kontakt finden</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Mitarbeitende suchen</div>
            </div>
          </Link>
        </div>
      </div>
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
