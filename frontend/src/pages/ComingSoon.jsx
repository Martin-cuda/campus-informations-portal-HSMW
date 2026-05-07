// ──────────────────────────────────────────────────────────────────────────
// ComingSoon.jsx
// Generische Modul-Seite die für jedes hinzugefügte Modul gerendert wird,
// das noch keine eigene Implementierung hat (z.B. Stundenplan, Raumplan,
// oder eigene Custom-Module die der User über "Modul hinzufügen" angelegt hat).
//
// Wenn das Modul-Objekt eigene Inhalte mitbringt (banner, sections, links)
// wird daraus eine richtige Modul-Seite. Sonst zeigt's einen Coming-Soon-Platzhalter.
// ──────────────────────────────────────────────────────────────────────────

// Link für den Zurück-Button, useLocation als Fallback um die aktuelle URL zu lesen
// falls kein module-Prop reingereicht wurde
import { Link, useLocation } from "react-router-dom";

/**
 * Erwartete Modul-Felder im `module`-Prop:
 *   id, label, icon, path, tag, description, color
 *   banner   (string, optional, Bild-URL)
 *   sections (array, optional, je { title, body })
 *   links    (array, optional, je { label, url })
 */
export default function ComingSoon({ module }) {
  const location = useLocation();

  // Felder defensiv auslesen mit Fallback-Werten, falls module gar nicht
  // reingegeben wurde oder einzelne Felder fehlen.
  const label  = module?.label || "Modul";
  const icon   = module?.icon  || "📦";
  const tag    = module?.tag   || "";
  const desc   = module?.description?.trim();
  const color  = module?.color || "#3b82f6";
  const banner = (module?.banner || "").trim();

  // Nur Abschnitte durchlassen die mindestens Titel ODER Body haben.
  // Der User kann im ModuleAdd-Form leere Slots erzeugen – die filtern wir hier raus.
  const sections = (module?.sections || []).filter(
    (s) => (s?.title?.trim() || s?.body?.trim())
  );
  // Links nur durchlassen wenn beide Pflichtfelder (Label + URL) gefüllt sind
  const links = (module?.links || []).filter(
    (l) => (l?.url?.trim() && l?.label?.trim())
  );

  // Hat das Modul überhaupt eigenen Inhalt? Wenn nein → Coming-Soon-Box statt Inhalt.
  const hatInhalt = banner || sections.length > 0 || links.length > 0;

  return (
    <div>
      {/* Header oben: Titel links (in Modul-Akzentfarbe), Zurück-Button rechts */}
      <div className="page-header fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="page-title" style={{ color }}>{icon} {label}</div>
          <div className="page-subtitle">{tag ? `${tag} · ` : ""}HS Mittweida</div>
        </div>
        <Link to="/" className="btn-secondary" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>
          ← Dashboard
        </Link>
      </div>

      {/* Banner-Bild (nur wenn URL gesetzt). Bei Fehler beim Laden blenden wir aus. */}
      {banner && (
        <div className="module-banner fade-up" style={{ borderColor: color }}>
          <img src={banner} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        </div>
      )}

      {/* Kurzbeschreibung als Intro-Karte falls vorhanden */}
      {desc && (
        <div className="card fade-up" style={{ borderTop: `3px solid ${color}`, marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: "#475569", whiteSpace: "pre-wrap" }}>{desc}</div>
        </div>
      )}

      {/* Pro Abschnitt eine eigene Karte mit Titel und Body */}
      {sections.map((s, i) => (
        <div key={i} className="card fade-up" style={{ marginBottom: 16 }}>
          {s.title?.trim() && (
            <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>
              {s.title}
            </div>
          )}
          {s.body?.trim() && (
            <div style={{ fontSize: 14, color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
              {s.body}
            </div>
          )}
        </div>
      ))}

      {/* Externe Links als Pills (nur wenn mind. 1 Link gefüllt ist) */}
      {links.length > 0 && (
        <div className="card fade-up" style={{ marginBottom: 16 }}>
          <div className="meal-section-title" style={{ marginBottom: 12 }}>Externe Links</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {links.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="module-link"
                style={{ borderColor: color, color }}
              >
                ↗ {l.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Fallback wenn nichts gepflegt wurde: 🚧 Coming-Soon-Box mit Routen-Info */}
      {!hatInhalt && (
        <div className="card fade-up" style={{ borderTop: `3px solid ${color}` }}>
          <div className="state-box">
            <div className="state-box-icon">🚧</div>
            <div className="state-box-text">
              <strong>{label}</strong> ist aktiviert – die Inhalte folgen in Kürze.
            </div>
            <div style={{ marginTop: 14, fontSize: 11, color: "#94a3b8", fontFamily: "'IBM Plex Mono', monospace" }}>
              Route: {module?.path || location.pathname}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
