// ──────────────────────────────────────────────────────────────────────────
// MensaLegende.jsx
// Eigene Unterseite die die Speisetyp-Codes erklärt die auf der Mensa-Seite
// als kleine Buchstaben-Badges erscheinen (R = Rind, S = Schwein, etc.).
// Erreichbar über Button oben rechts auf /mensa, oder direkt unter /mensa/legende.
// ──────────────────────────────────────────────────────────────────────────

// Link für den Zurück-Button zur Mensa-Seite
import { Link } from "react-router-dom";

// Statische Liste – die Speisetyp-Codes ändern sich praktisch nie, also
// hardcoded hier statt extra API-Aufruf. Die Auswahl orientiert sich an
// der Studentenwerk-Konvention.
//
// Zusatzstoffe (1-10) und Allergene (a-n) sind hier bewusst nicht dabei –
// die HSMW-API liefert sie aktuell nicht pro Gericht aus, also wäre eine
// Erklärung dafür für den User irreführend. Sobald das Backend die nachreicht,
// kann hier noch ein Block dazu.
const MEALTYPES = [
  { code: "R",  text: "Rind" },
  { code: "S",  text: "Schwein" },
  { code: "G",  text: "Geflügel" },
  { code: "F",  text: "Fisch" },
  { code: "L",  text: "Lamm" },
  { code: "W",  text: "Wild" },
  { code: "V",  text: "Vegetarisch" },
  { code: "VG", text: "Vegan" },
  { code: "A",  text: "Alkohol" },
  { code: "MI", text: "Mensa International" },
];

export default function MensaLegende() {
  return (
    <div>
      {/* Header mit Titel + Untertitel */}
      <div className="page-header fade-up">
        <div className="page-title">📋 Legende</div>
        <div className="page-subtitle">Speisetyp-Codes des Speiseplans · HS Mittweida</div>
      </div>

      {/* Zurück-Link zur Mensa-Hauptseite */}
      <div style={{ marginBottom: 18 }} className="fade-up">
        <Link to="/mensa" className="btn-secondary" style={{ textDecoration: "none" }}>
          ← Zurück zum Speiseplan
        </Link>
      </div>

      {/* Karte mit dem Code-Grid – jede Zeile = Code-Badge + Klartext */}
      <div className="card fade-up">
        <div className="meal-section-title">Speisetypen</div>
        <div className="legend-grid">
          {MEALTYPES.map((it) => (
            <div key={it.code} className="legend-row">
              <span className="badge badge-gray">{it.code}</span>
              <span className="legend-text">{it.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
