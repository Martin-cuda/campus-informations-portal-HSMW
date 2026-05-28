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

import { useState, useEffect } from "react";

const API_URL = "http://localhost:8000"; // Backend-URL für Raumbelegungs-API

// Sortiert Räume nach Etage (KG → EG → 1.OG → 2.OG ...) und dann nach Raumnummer
const etagenReihenfolge = { "KG": 0, "EG": 1, "1. OG": 2, "2. OG": 3, "3. OG": 4, "4. OG": 5 };

function raeumeSortieren(raeume) {
  return [...raeume].sort((a, b) => {
    // Zuerst nach Etage sortieren
    const etageA = etagenReihenfolge[a.etage] ?? 99;
    const etageB = etagenReihenfolge[b.etage] ?? 99;
    if (etageA !== etageB) return etageA - etageB;
    // Dann nach Raumnummer sortieren
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });
}

// Prüft ob ein Raum im angegebenen Zeitslot belegt ist
function istBelegtImZeitslot(raum, von, bis) {
  if (!raum.belegt || !raum.von || !raum.bis || !von || !bis) return false;
  // Überschneidung prüfen: Raum ist belegt wenn sein Zeitslot den Filterslot überlappt
  return raum.von < bis && raum.bis > von;
}

export default function Raumfinder() {
  // ── FABIAN: State (unverändert) ────────────────────────────────────────
  const [haeuser, setHaeuser] = useState([]);
  //haeuser = vollständige Liste aller Gebäude mit ihren Räumen (inkl. Belegungsstatus)
  const [ausgewaehltesHaus, setAusgewaehltesHaus] = useState(null);
  // ausgewaehltesHaus = aktuell angeklicktes Gebäude (null wenn keins ausgewählt)
  const [ausgewaehltesRaum, setAusgewaehltesRaum] = useState(null);
  // ausgewaehltesRaum = aktuell angeklickter Raum im Detailbereich (null wenn keins ausgewählt)
  const [formular, setFormular] = useState({ professor: "", modul: "", von: "", bis: "" });
  // formular = temporäre Eingabewerte für Professor, Modul und Belegungszeit im Detailbereich

  // ── Filter State ──────────────────────────────────────────────────────
  // filterEtage = aktuell ausgewählte Etage ("" = alle)
  const [filterEtage, setFilterEtage] = useState("");
  // filterVon = Zeitfilter von
  const [filterVon, setFilterVon] = useState("");
  // filterBis = Zeitfilter bis
  const [filterBis, setFilterBis] = useState("");
  // nurFreie = wenn true, werden belegte Räume im Zeitslot ausgeblendet
  const [nurFreie, setNurFreie] = useState(false);

// Beim Laden der Seite: aktuelle Belegungen vom Backend holen
useEffect(() => {
  // Zuerst Häuser vom Backend holen
  Promise.all([
    fetch(`${API_URL}/api/haeuser/`).then((r) => r.json()),
    fetch(`${API_URL}/api/raeume`).then((r) => r.json()),
  ])
    .then(([haeuserData, belegungenData]) => {
      const belegungen = belegungenData.belegungen || {};
      // Belegungen in die Häuser-Liste einpflegen
      const haeuserMitBelegungen = haeuserData.map((h) => ({
        ...h,
        raeume: h.raeume.map((r) => {
          const key = `${h.id}_${r.id}`;
          const belegung = belegungen[key];
          if (belegung) {
            return { ...r, belegt: true, professor: belegung.professor, modul: belegung.modul, bis: belegung.bis };
          }
          return r;
        }),
      }));
      setHaeuser(haeuserMitBelegungen);
    })
    .catch(() => console.warn("Backend nicht erreichbar"));
}, []);

  // ── FABIAN: Handler (unverändert) ─────────────────────────────────────
  // Haus-Button angeklickt: Zeige Räume dieses Hauses, setze Raum-Auswahl zurück
  const hausAnzeigen = (haus) => {
    setAusgewaehltesHaus(haus);
    setAusgewaehltesRaum(null);
  };

  // Klick auf einen Raum: Zeige Details dieses Raums im Formular, fülle Formular mit aktuellen Werten
  const raumAnzeigen = (raum) => {
    setAusgewaehltesRaum(raum);
    setFormular({ professor: raum.professor, modul: raum.modul, von: raum.von, bis: raum.bis });
  };

  // BelegungsToggle: Wenn Raum belegt → markiere als frei, sonst → markiere als belegt mit Formular-Daten
  const raumToggle = async () => {
    if (ausgewaehltesRaum.belegt) {
      // Raum freigeben – DELETE Request ans Backend
      await fetch(`${API_URL}/api/raeume/belegen/${ausgewaehltesHaus.id}/${ausgewaehltesRaum.id}`, {
        method: "DELETE",
      });
    } else {
      // Raum belegen – POST Request ans Backend
      await fetch(`${API_URL}/api/raeume/belegen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          haus_id: ausgewaehltesHaus.id,
          raum_id: ausgewaehltesRaum.id,
          professor: formular.professor,
          modul: formular.modul,
          von: formular.von,
          bis: formular.bis,
        }),
      });
    }
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
          {/* ── Filter-Leiste ─────────────────────────────────────── */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" }} className="card">
            {/* Etagen-Filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: 12, color: "#64748b" }}>Etage</label>
              <select
                value={filterEtage}
                onChange={(e) => setFilterEtage(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--border)", fontFamily: "inherit", fontSize: 13 }}
              >
                <option value="">Alle Etagen</option>
                {[...new Set(ausgewaehltesHaus.raeume.map((r) => r.etage))]
                  .sort((a, b) => (etagenReihenfolge[a] ?? 99) - (etagenReihenfolge[b] ?? 99))
                  .map((etage) => (
                    <option key={etage} value={etage}>{etage}</option>
                  ))}
              </select>
            </div>

            {/* Zeitfilter Von */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: 12, color: "#64748b" }}>Von</label>
              <input
                type="time"
                value={filterVon}
                onChange={(e) => setFilterVon(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--border)", fontFamily: "inherit", fontSize: 13 }}
              />
            </div>

            {/* Zeitfilter Bis */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: 12, color: "#64748b" }}>Bis</label>
              <input
                type="time"
                value={filterBis}
                onChange={(e) => setFilterBis(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--border)", fontFamily: "inherit", fontSize: 13 }}
              />
            </div>

            {/* Nur freie Räume Checkbox */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px" }}>
              <input
                type="checkbox"
                id="nurFreie"
                checked={nurFreie}
                onChange={(e) => setNurFreie(e.target.checked)}
              />
              <label htmlFor="nurFreie" style={{ fontSize: 13, color: "#374151", cursor: "pointer" }}>
                Nur freie Räume anzeigen
              </label>
            </div>

            {/* Filter zurücksetzen */}
            <button
              onClick={() => { setFilterEtage(""); setFilterVon(""); setFilterBis(""); setNurFreie(false); }}
              style={{ marginTop: "16px", padding: "6px 12px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", fontSize: 12 }}
            >
              Filter zurücksetzen
            </button>
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            {raeumeSortieren(ausgewaehltesHaus.raeume)
              .filter((raum) => {
                // Etagen-Filter
                if (filterEtage && raum.etage !== filterEtage) return false;
                // Nur freie Räume im Zeitslot
                if (nurFreie && istBelegtImZeitslot(raum, filterVon, filterBis)) return false;
                return true;
              })
              .map((raum) => (
                  
              <div key={raum.id}>
                <div
                  onClick={() => raumAnzeigen(raum)}
                  style={{
                    padding: "1rem",
                    width: "150px",
                    textAlign: "center",
                    borderRadius: "var(--radius)",
                    cursor: "pointer",
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

                {/* Detailbereich direkt unter der angeklickten Kachel */}
                {ausgewaehltesRaum?.id === raum.id && (
                  <div className="card" style={{ width: "300px", marginTop: "0.5rem" }}>
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
                        <p style={{ marginBottom: 6, fontSize: 14, color: "#374151" }}>
                          <strong>Belegt von:</strong> {ausgewaehltesRaum.von} Uhr
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
                        <label className="login-label">Belegt von (z.B. 13:00)</label>
                        <input
                          className="login-input"
                          placeholder="13:00"
                          value={formular.von}
                          onChange={(e) => setFormular({ ...formular, von: e.target.value })}
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
