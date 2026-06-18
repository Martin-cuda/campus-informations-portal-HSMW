// ──────────────────────────────────────────────────────────────────────────
// Dashboard.jsx
// Startseite der App: links Modul-Kacheln (Titel + Beschreibung + Pfeil)
// rechts ein Campusfoto über die volle Höhe.
// Oben kleine Info-Widgets mit Live-Daten aus dem Backend.
// ──────────────────────────────────────────────────────────────────────────

import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

// Kurzbeschreibungen für die bekannten Core-Module. Custom-Module (z.B.
// Prüfungen, Bibliothek, Events) fallen auf eine generische Beschreibung
// zurück, da sie keine festen Icons/Texte haben.
const MODUL_BESCHREIBUNG = {
  mensa:      "Speiseplan ansehen",
  raumfinder: "Freie Räume finden",
  kontakt:    "Mitarbeitende finden",
  news:       "Aktuelle Meldungen",
};

function beschreibung(mod) {
  return MODUL_BESCHREIBUNG[mod.id] || "Modul öffnen";
}

export default function Dashboard({ modules }) {
  // ── Widget State ──────────────────────────────────────────────────────
  const [widgetDaten, setWidgetDaten] = useState({
    mensaGerichte: null,
    raeumeFreie: null,
    kontakteAnzahl: null,
  });

  useEffect(() => {
    const API = "http://localhost:8000";

    fetch(`${API}/api/mensa/heute`)
      .then((r) => r.json())
      .then((data) => {
        const anzahl = (data.kategorien || []).reduce(
          (sum, kat) => sum + (kat.menus || []).length, 0
        );
        setWidgetDaten((prev) => ({ ...prev, mensaGerichte: anzahl }));
      })
      .catch(() => setWidgetDaten((prev) => ({ ...prev, mensaGerichte: "–" })));

    fetch(`${API}/api/haeuser/`)
      .then((r) => r.json())
      .then((data) => {
        const freie = data.reduce(
          (sum, haus) => sum + (haus.raeume || []).filter((r) => !r.belegt).length, 0
        );
        setWidgetDaten((prev) => ({ ...prev, raeumeFreie: freie }));
      })
      .catch(() => setWidgetDaten((prev) => ({ ...prev, raeumeFreie: "–" })));

    fetch(`${API}/api/contacts/`)
      .then((r) => r.json())
      .then((data) => {
        setWidgetDaten((prev) => ({ ...prev, kontakteAnzahl: data.count }));
      })
      .catch(() => setWidgetDaten((prev) => ({ ...prev, kontakteAnzahl: "–" })));
  }, []);

  return (
    <div>
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

      {/* Module-Kacheln links + Campusfoto rechts, im TU-Ilmenau-Stil */}
      <div className="dashboard-main-grid fade-up">

        <div>
          <div className="module-tile-grid">
            {modules.map((mod) => (
              <Link to={mod.path} key={mod.id} className="module-tile-row">
                <div className="module-tile-row-text">
                  <div className="module-tile-row-title">{mod.label}</div>
                </div>
                <span className="module-tile-row-arrow">›</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="dashboard-photo">
          <img src="/Campusfoto.jpg" alt="Campus HS Mittweida" />
        </div>

      </div>
    </div>
  );
}