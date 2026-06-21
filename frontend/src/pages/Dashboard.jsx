// ──────────────────────────────────────────────────────────────────────────
// Dashboard.jsx
// Startseite der App: Begrüssung + Datum, anklickbare Info-Widgets mit
// Live-Daten, Modul-Kacheln (Titel + Beschreibung) und Campusfoto.
// ──────────────────────────────────────────────────────────────────────────

import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

// Kurzbeschreibungen für die bekannten Core-Module. Custom-Module fallen auf
// eine generische Beschreibung zurück, da sie keine festen Texte haben.
const MODUL_BESCHREIBUNG = {
  mensa:      "Speiseplan ansehen",
  raumfinder: "Freie Räume finden",
  kontakt:    "Mitarbeitende finden",
  news:       "Aktuelle Meldungen",
};

function beschreibung(mod) {
  return MODUL_BESCHREIBUNG[mod.id] || "Modul öffnen";
}

// Tageszeit-abhängige Begrüssung
function begruessung() {
  const h = new Date().getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

export default function Dashboard({ modules }) {
  // ── Widget State ──────────────────────────────────────────────────────
  const [w, setW] = useState({
    mensaGerichte: null,
    mensaKategorien: null,
    raeumeFreie: null,
    raeumeGesamt: null,
    kontakteAnzahl: null,
  });

  useEffect(() => {
    // Relativ → selber Origin über den Caddy-/api-Proxy: schnell, kein CORS und
    // kein Hängen an einer fest verdrahteten localhost-Adresse (war der Bremser).
    const API = "";

    fetch(`${API}/api/mensa/heute`)
      .then((r) => r.json())
      .then((data) => {
        const kategorien = data.kategorien || [];
        const gerichte = kategorien.reduce((s, k) => s + (k.menus || []).length, 0);
        setW((p) => ({ ...p, mensaGerichte: gerichte, mensaKategorien: kategorien.length }));
      })
      .catch(() => setW((p) => ({ ...p, mensaGerichte: "–" })));

    fetch(`${API}/api/haeuser/`)
      .then((r) => r.json())
      .then((data) => {
        const raeume = (Array.isArray(data) ? data : []).flatMap((h) => h.raeume || []);
        const frei = raeume.filter((r) => !r.belegt).length;
        setW((p) => ({ ...p, raeumeFreie: frei, raeumeGesamt: raeume.length }));
      })
      .catch(() => setW((p) => ({ ...p, raeumeFreie: "–" })));

    fetch(`${API}/api/contacts/`)
      .then((r) => r.json())
      .then((data) => setW((p) => ({ ...p, kontakteAnzahl: data.count })))
      .catch(() => setW((p) => ({ ...p, kontakteAnzahl: "–" })));
  }, []);

  const heuteLabel = new Date().toLocaleDateString("de-DE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // ── Anzeige-Werte (mit sauberen Zwischenständen statt Dauer-"...") ──
  const mensaWert =
    w.mensaGerichte === null ? "…"
    : w.mensaGerichte === "–" ? "Nicht erreichbar"
    : w.mensaGerichte === 0 ? "Heute kein Plan"
    : `${w.mensaGerichte} Gerichte heute`;
  const mensaSub =
    w.mensaKategorien ? `${w.mensaKategorien} Kategorien · Speiseplan ansehen` : "Speiseplan ansehen";

  const raeumeWert =
    w.raeumeFreie === null ? "…"
    : w.raeumeFreie === "–" ? "Nicht erreichbar"
    : w.raeumeGesamt ? `${w.raeumeFreie} von ${w.raeumeGesamt} frei`
    : `${w.raeumeFreie} Räume frei`;

  const kontakteWert =
    w.kontakteAnzahl === null ? "…"
    : w.kontakteAnzahl === "–" ? "Nicht erreichbar"
    : `${w.kontakteAnzahl} Einträge`;

  // Anklickbare Status-Karte (führt direkt ins jeweilige Modul)
  const cardStyle = { textDecoration: "none", color: "inherit", display: "block" };
  const subStyle = { fontSize: 12, color: "var(--text-tertiary)", marginTop: 6 };

  return (
    <div>
      {/* Begrüssung + Datum */}
      <div className="page-header fade-up">
        <div className="page-title">{begruessung()}</div>
        <div className="page-subtitle" style={{ textTransform: "capitalize" }}>{heuteLabel}</div>
      </div>

      {/* Info-Widgets – jetzt anklickbar und mit Kontext */}
      <div className="card-grid" style={{ marginBottom: 28 }}>
        <Link to="/mensa" className="status-card fade-up" style={cardStyle}>
          <div style={{ width: "100%", height: 3, background: "#2596be", borderRadius: 2, marginBottom: 10 }} />
          <div className="status-card-label">Mensa</div>
          <div className="status-card-value" style={{ color: "#2596be" }}>{mensaWert}</div>
          <div style={subStyle}>{mensaSub} ›</div>
        </Link>

        <Link to="/raumfinder" className="status-card fade-up" style={cardStyle}>
          <div style={{ width: "100%", height: 3, background: "#22c55e", borderRadius: 2, marginBottom: 10 }} />
          <div className="status-card-label">Raumfinder</div>
          <div className="status-card-value" style={{ color: "#22c55e" }}>{raeumeWert}</div>
          <div style={subStyle}>Freie Räume anzeigen ›</div>
        </Link>

        <Link to="/kontakt" className="status-card fade-up" style={cardStyle}>
          <div style={{ width: "100%", height: 3, background: "#8b5cf6", borderRadius: 2, marginBottom: 10 }} />
          <div className="status-card-label">Kontakte</div>
          <div className="status-card-value" style={{ color: "#8b5cf6" }}>{kontakteWert}</div>
          <div style={subStyle}>Verzeichnis öffnen ›</div>
        </Link>
      </div>

      {/* Module-Kacheln links + Campusfoto rechts */}
      <div className="dashboard-main-grid fade-up">

        <div>
          <div className="module-tile-grid">
            {modules.map((mod) => (
              <Link to={mod.path} key={mod.id} className="module-tile-row">
                <div className="module-tile-row-text">
                  <div className="module-tile-row-title">{mod.label}</div>
                  <div className="module-tile-row-sub" style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                    {beschreibung(mod)}
                  </div>
                </div>
                <span className="module-tile-row-arrow">›</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="dashboard-photo">
          <img src="/Campusfoto.jpg" alt="Campus HS Mittweida" decoding="async" />
        </div>

      </div>
    </div>
  );
}
