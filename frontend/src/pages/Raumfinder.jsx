// ── FABIAN (ORIGINAL) ─────────────────────────────────────────────────────
// Raumfinder-Seite: zeigt Gebäude und Räume, erlaubt Belegungs-Toggle.
// Originalcode von Fabian, keine Logik-Änderungen.
//
// [MERGE: Claude] Styling-Anpassungen:
//   1. Wrapper <div style={{ padding: "2rem" }}> durch standard page-header-
//      Klassen ersetzt damit das Layout konsistent mit den anderen Seiten ist.
//   2. Haus-Buttons und Raum-Kacheln nutzen jetzt CSS-Variablen aus Fabian's
//      index.css (--accent, --card, --border, --radius, --green, --red) statt
//      hardcodierter Hex-Werte. Damit folgt die Seite dem gemeinsamen Theme.
//   3. Detail-Box nutzt .card-Klasse aus Fabian's index.css.
//   4. <h1> und <h2> durch .page-title / .page-subtitle ersetzt.
//   Fabian's gesamte JSX-Logik (useState, toggle, Formular) ist unverändert.
// ──────────────────────────────────────────────────────────────────────────

import { useState } from "react";

// Fabian's statische Demo-Daten (unverändert)
const initialHaeuser = [
  {
    id: "haus2",
    name: "Haus 2",
    raeume: [
      { id: "002", name: "Raum 002", etage: "EG",    belegt: false, professor: "", modul: "", bis: "" },
      { id: "202", name: "Raum 202", etage: "2. OG", belegt: false, professor: "", modul: "", bis: "" },
    ],
  },
  {
    id: "haus6",
    name: "Haus 6",
    raeume: [
      { id: "101", name: "Raum 101", etage: "1. OG", belegt: false, professor: "", modul: "", bis: "" },
      { id: "401", name: "Raum 401", etage: "4. OG", belegt: false, professor: "", modul: "", bis: "" },
    ],
  },
];

export default function Raumfinder() {
  // ── FABIAN: State (unverändert) ────────────────────────────────────────
  const [haeuser, setHaeuser]                     = useState(initialHaeuser);
  const [ausgewaehltesHaus, setAusgewaehltesHaus] = useState(null);
  const [ausgewaehltesRaum, setAusgewaehltesRaum] = useState(null);
  const [formular, setFormular]                   = useState({ professor: "", modul: "", bis: "" });

  // ── FABIAN: Handler (unverändert) ─────────────────────────────────────
  const hausAnzeigen = (haus) => {
    setAusgewaehltesHaus(haus);
    setAusgewaehltesRaum(null);
  };

  const raumAnzeigen = (raum) => {
    setAusgewaehltesRaum(raum);
    setFormular({ professor: raum.professor, modul: raum.modul, bis: raum.bis });
  };

  const raumToggle = () => {
    const neueHaeuser = haeuser.map((h) => {
      if (h.id !== ausgewaehltesHaus.id) return h;
      return {
        ...h,
        raeume: h.raeume.map((r) => {
          if (r.id !== ausgewaehltesRaum.id) return r;
          if (r.belegt) {
            return { ...r, belegt: false, professor: "", modul: "", bis: "" };
          } else {
            return { ...r, belegt: true, ...formular };
          }
        }),
      };
    });
    setHaeuser(neueHaeuser);
    const aktualisiertesHaus = neueHaeuser.find((h) => h.id === ausgewaehltesHaus.id);
    setAusgewaehltesHaus(aktualisiertesHaus);
    const aktualisiertesRaum = aktualisiertesHaus.raeume.find((r) => r.id === ausgewaehltesRaum.id);
    setAusgewaehltesRaum(aktualisiertesRaum);
  };

  return (
    <div>
      {/* [MERGE: Claude] page-header statt <h1> (konsistentes Layout) */}
      <div className="page-header fade-up">
        <div className="page-title">Raumfinder</div>
        <div className="page-subtitle">Gebäude & Belegungsstatus · HS Mittweida</div>
      </div>

      {/* ── FABIAN: Häuser-Auswahl ─────────────────────────────────────── */}
      {/* [MERGE: Claude] Inline-Farben durch CSS-Variablen ersetzt */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }} className="fade-up">
        {haeuser.map((haus) => (
          <button
            key={haus.id}
            onClick={() => hausAnzeigen(haus)}
            style={{
              padding: "10px 24px",
              fontSize: "14px",
              cursor: "pointer",
              backgroundColor: ausgewaehltesHaus?.id === haus.id ? "var(--accent)" : "var(--card)",
              color: ausgewaehltesHaus?.id === haus.id ? "#fff" : "#374151",
              border: "1px solid",
              borderColor: ausgewaehltesHaus?.id === haus.id ? "var(--accent)" : "var(--border)",
              borderRadius: "var(--radius)",
              fontFamily: "inherit",
              fontWeight: ausgewaehltesHaus?.id === haus.id ? 600 : 400,
              transition: "all 0.15s",
            }}
          >
            {haus.name}
          </button>
        ))}
      </div>

      {/* ── FABIAN: Räume des gewählten Hauses ───────────────────────── */}
      {ausgewaehltesHaus && (
        <div className="fade-up">
          {/* [MERGE: Claude] <h2> durch page-subtitle-Style ersetzt */}
          <div style={{ fontSize: 14, fontWeight: 600, color: "#64748b", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "IBM Plex Mono, monospace" }}>
            {ausgewaehltesHaus.name} – Räume
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            {ausgewaehltesHaus.raeume.map((raum) => (
              <div
                key={raum.id}
                onClick={() => raumAnzeigen(raum)}
                style={{
                  padding: "1rem",
                  width: "150px",
                  textAlign: "center",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                  // [MERGE: Claude] --green / --red statt hardcodiert
                  backgroundColor: raum.belegt ? "var(--red)" : "var(--green)",
                  color: "white",
                  fontWeight: "bold",
                  border: "3px solid",
                  borderColor: ausgewaehltesRaum?.id === raum.id ? "var(--navy)" : "transparent",
                  transition: "border-color 0.15s",
                }}
              >
                <div>{raum.name}</div>
                <div style={{ fontSize: "0.8rem", marginTop: 4, opacity: 0.85 }}>{raum.etage}</div>
                <div style={{ marginTop: 4 }}>{raum.belegt ? "Belegt" : "Frei"}</div>
              </div>
            ))}
          </div>

          {/* ── FABIAN: Raum-Detailbereich ────────────────────────── */}
          {/* [MERGE: Claude] <div style={{ background:"#f5f5f5"... }}> → .card-Klasse */}
          {ausgewaehltesRaum && (
            <div className="card" style={{ maxWidth: "420px" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 14 }}>
                {ausgewaehltesRaum.name}
              </div>

              {ausgewaehltesRaum.belegt ? (
                <div>
                  <p style={{ marginBottom: 6, fontSize: 14, color: "#374151" }}>
                    <strong>Professor:</strong> {ausgewaehltesRaum.professor}
                  </p>
                  <p style={{ marginBottom: 6, fontSize: 14, color: "#374151" }}>
                    <strong>Modul:</strong> {ausgewaehltesRaum.modul}
                  </p>
                  <p style={{ marginBottom: 12, fontSize: 14, color: "#374151" }}>
                    <strong>Belegt bis:</strong> {ausgewaehltesRaum.bis} Uhr
                  </p>
                  <button
                    onClick={raumToggle}
                    className="btn-primary"
                    style={{ background: "var(--green)", width: "auto", padding: "9px 20px" }}
                  >
                    Als frei markieren
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ marginBottom: 12, fontSize: 14, color: "#64748b" }}>
                    Dieser Raum ist aktuell frei.
                  </p>
                  <label className="login-label">Professor</label>
                  <input
                    className="login-input"
                    placeholder="z.B. Prof. Dr. Roschke"
                    value={formular.professor}
                    onChange={(e) => setFormular({ ...formular, professor: e.target.value })}
                  />
                  <label className="login-label">Modul</label>
                  <input
                    className="login-input"
                    placeholder="z.B. Informatik II"
                    value={formular.modul}
                    onChange={(e) => setFormular({ ...formular, modul: e.target.value })}
                  />
                  <label className="login-label">Belegt bis (z.B. 14:30)</label>
                  <input
                    className="login-input"
                    placeholder="14:30"
                    value={formular.bis}
                    onChange={(e) => setFormular({ ...formular, bis: e.target.value })}
                  />
                  <button
                    onClick={raumToggle}
                    className="btn-primary"
                    style={{ background: "var(--red)", width: "auto", padding: "9px 20px" }}
                  >
                    Als belegt markieren
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
