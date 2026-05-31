// ──────────────────────────────────────────────────────────────────────────
// Mensa.jsx
// Speiseplan-Seite. Holt die Daten vom Backend, lässt den User über Tab-Buttons
// zwischen den Tagen wechseln und zeigt die Gerichte gruppiert nach Kategorie.
// ──────────────────────────────────────────────────────────────────────────

// useEffect für API-Call beim Mount, useState für lokale Zustände,
// useMemo für berechnete Werte die nicht bei jedem Render neu erzeugt werden sollen.
import { useEffect, useMemo, useState } from "react";

// Link für Sprung zur Legenden-Seite
import { Link } from "react-router-dom";
// ── ARI (Ticket 3): Notification-Formular fuer Lieblingsgericht-Mail ──
import MensaNotifyForm from "../components/MensaNotifyForm";

// Basis-URL des Backend-Servers (Dev-Umgebung).
// In der Produktion müsste das später eine Umgebungsvariable werden.
const API = "http://localhost:8000";

/**
 * Mensa-Seite
 * Backend-Endpoint:  GET {API}/api/mensa/
 *   →  { tage: [ { datum_raw, datum_label, kategorien: [ { titel, menus: [ { id, name, beschreibung, preis, mealtypes, active } ] } ] } ] }
 *
 * Verhalten:
 *  - Vergangene Tage werden ausgeblendet (Studis interessiert nur heute + Zukunft)
 *  - Datums-Labels werden hier nochmal auf Deutsch formatiert, damit sie nicht von der
 *    System-Locale des Backend-Servers abhängen
 *  - Mealtype-Buchstaben (R/S/G/F/V/VG/...) bekommen Tooltip auf den Badges, voller
 *    Codeschlüssel inkl. Zusatzstoffen + Allergenen liegt unter /mensa/legende
 *  - Inaktive Gerichte (active=false) werden mit grauem diagonalem Kreuz dargestellt
 */

// Deutsche Wochentag-Kurzformen. Index entspricht Date.getDay()
// (0 = Sonntag, 1 = Montag, … 6 = Samstag).
const TAG_KURZ_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

// Bedeutung der Mealtype-Codes – wird als Tooltip auf den Badges angezeigt.
// Volle Liste auf der Legenden-Seite.
const MEALTYPE_LABELS = {
  R:  "Rind",
  S:  "Schwein",
  G:  "Geflügel",
  F:  "Fisch",
  L:  "Lamm",
  W:  "Wild",
  V:  "Vegetarisch",
  VG: "Vegan",
  A:  "Alkohol",
  MI: "Mensa International",
};

// Wochentag + Datum als langes deutsches Label, z.B. "Mittwoch, 06.05.2026".
// unixSek ist ein Unix-Timestamp in Sekunden (so liefert die HSMW-API das),
// in JavaScript brauchen wir Millisekunden, deshalb * 1000.
function formatDatumLang(unixSek) {
  if (!unixSek) return "";
  const d = new Date(unixSek * 1000);
  return d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Kurzform Wochentag, z.B. "Mi" – für die Tag-Tabs oben.
function formatTagKurz(unixSek) {
  if (!unixSek) return "?";
  return TAG_KURZ_DE[new Date(unixSek * 1000).getDay()] || "?";
}

// Kurzes Datum "06.05.2026" – ebenfalls für Tag-Tabs.
function formatDatumKurz(unixSek) {
  if (!unixSek) return "";
  const d = new Date(unixSek * 1000);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Gibt ein Date-Objekt zurück das auf 00:00:00 Uhr heute steht.
// Brauchen wir um zu vergleichen ob ein Tag vor oder nach heute liegt.
function tagesAnfang(date = new Date()) {
  const x = new Date(date);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Prüft ob der gegebene Unix-Timestamp auf den heutigen Tag (lokal) fällt.
function isHeute(unixSek) {
  if (!unixSek) return false;
  const d = new Date(unixSek * 1000);
  const h = new Date();
  return d.getFullYear() === h.getFullYear() && d.getMonth() === h.getMonth() && d.getDate() === h.getDate();
}

// Hauptkomponente
export default function Mensa() {
  // tage = die Liste der zukünftigen Tage (heute + danach)
  const [tage, setTage]       = useState([]);
  // aktivIdx = Index in der tage-Liste der gerade ausgewählt ist
  const [aktivIdx, setAktiv]  = useState(0);
  // status steuert was die Seite zeigt: spinner, daten, leer, fehler
  const [status, setStatus]   = useState("loading"); // loading | ok | empty | error
  // errorMsg = Fehlertext den wir bei status=error klein anzeigen
  const [errorMsg, setErrMsg] = useState("");

  // useEffect mit leerer Dependency-Liste = einmaliger API-Call beim Mount
  useEffect(() => {
    // AbortController erlaubt uns das Request abzubrechen falls die Komponente
    // unmounted bevor die Antwort kommt (z.B. User klickt schnell weiter).
    const ctrl = new AbortController();
    fetch(`${API}/api/mensa/`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        // Heute morgen 0 Uhr als Schwelle für "vergangen vs zukünftig"
        const heute0 = tagesAnfang();
        // Nur heute + zukünftige Tage durchlassen.
        // datum_raw ist ein Unix-Timestamp in Sekunden, also * 1000.
        const tageRaw = (Array.isArray(data?.tage) ? data.tage : [])
          .filter((t) => new Date((t.datum_raw || 0) * 1000) >= heute0);

        if (tageRaw.length === 0) {
          // Keine Tage in der Zukunft → empty-State zeigen
          setStatus("empty");
          return;
        }
        setTage(tageRaw);
        // Wenn heute drin ist, nehmen wir den als aktiven Tab. Sonst Index 0
        // (erster zukünftiger Tag).
        const heuteIdx = tageRaw.findIndex((t) => isHeute(t.datum_raw));
        setAktiv(heuteIdx >= 0 ? heuteIdx : 0);
        setStatus("ok");
      })
      .catch((err) => {
        // Wenn der Abbruch vom AbortController kommt, einfach ignorieren.
        if (err.name === "AbortError") return;
        setErrMsg(err.message || String(err));
        setStatus("error");
      });
    // Cleanup: beim Unmount Request abbrechen
    return () => ctrl.abort();
  }, []);

  // useMemo: aktiverTag wird nur neu berechnet wenn tage oder aktivIdx sich ändern.
  // Spart minimal Performance, vor allem aber stabile Referenz für interne Logik.
  const aktiverTag = useMemo(() => tage[aktivIdx] || null, [tage, aktivIdx]);

  return (
    <div>
      {/* Header oben mit Titel links und Legenden-Button rechts */}
      <div className="page-header fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="page-title">Mensa</div>
          <div className="page-subtitle">Speiseplan · HS Mittweida</div>
        </div>
        <Link to="/mensa/legende" className="btn-secondary" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>
         Legende
        </Link>
      </div>

      {/* Lade-Spinner wenn der Request noch läuft */}
      {status === "loading" && (
        <div className="state-box fade-up">
          <div className="state-box-text">Speiseplan wird geladen…</div>
        </div>
      )}

      {/* Fehlermeldung wenn der Request fehlschlug (Backend offline o.ä.) */}
      {status === "error" && (
        <div className="state-box fade-up">
          <div className="state-box-text">
            Speiseplan konnte nicht geladen werden.
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Empty-State wenn keine zukünftigen Tage da sind */}
      {status === "empty" && (
        <div className="state-box fade-up">
          <div className="state-box-text">Aktuell ist kein Speiseplan verfügbar.</div>
        </div>
      )}

      {/* Hauptanzeige wenn die Daten geladen sind */}
      {status === "ok" && (
        <>
          {/* Tag-Auswahl: ein Button pro verfügbarem Tag */}
          <div className="day-tabs fade-up">
            {tage.map((t, i) => {
              const heute = isHeute(t.datum_raw);
              const aktiv = i === aktivIdx;
              return (
                <button
                  key={t.datum_raw ?? i}
                  className={"day-tab" + (aktiv ? " active" : "")}
                  onClick={() => setAktiv(i)}
                >
                  <span className="day-tab-name">{formatTagKurz(t.datum_raw)}</span>
                  <span className="day-tab-date">{formatDatumKurz(t.datum_raw)}</span>
                  {/* "heute"-Pillchen rechts oben am aktuellen Tag */}
                  {heute && <span className="day-tab-pill">heute</span>}
                </button>
              );
            })}
          </div>

          {/* Header für aktiven Tag (Wochentag in Deutsch, unabhängig vom Backend) */}
          <div className="day-header fade-up">{formatDatumLang(aktiverTag?.datum_raw)}</div>

          {/* Falls der aktive Tag keine Kategorien/Gerichte hat */}
          {(aktiverTag?.kategorien || []).length === 0 && (
            <div className="state-box fade-up">
              <div className="state-box-text">Für diesen Tag gibt es keinen Speiseplan.</div>
            </div>
          )}

          {/* Pro Kategorie ein Block mit Titel + Grid an Mahlzeiten-Karten */}
          {(aktiverTag?.kategorien || []).map((kat, ki) => (
            <section key={ki} className="meal-section fade-up">
              <div className="meal-section-title">{kat.titel || "Speisen"}</div>
              <div className="meal-grid">
                {(kat.menus || []).map((meal, mi) => {
                  // Falls active explizit false → Kachel mit Kreuz darstellen
                  const aktiv = meal.active !== false;
                  return (
                    <div
                      className={"meal-card fade-up" + (aktiv ? "" : " meal-card-unavailable")}
                      key={meal.id ?? mi}
                      aria-disabled={!aktiv}
                    >
                      <div className="meal-name">{meal.name || "Unbekanntes Gericht"}</div>
                      {meal.beschreibung && <div className="meal-meta">{meal.beschreibung}</div>}
                      {meal.preis && <div className="meal-price">{meal.preis}</div>}

                      {/* Wenn aktiv: Mealtype-Badges; wenn inaktiv: "Nicht verfügbar"-Badge */}
                      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {aktiv ? (
                          (meal.mealtypes || []).map((mt, ti) => {
                            const code = String(mt);
                            const label = MEALTYPE_LABELS[code];
                            return (
                              <span
                                key={ti}
                                className="badge badge-gray"
                                title={label || code}
                              >
                                {code}
                              </span>
                            );
                          })
                        ) : (
                          <span className="badge badge-gray" style={{ background: "#e2e8f0", color: "#475569", fontWeight: 600 }}>
                            Nicht verfügbar
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}
    
      {/* ── ARI (Ticket 3): Mensa-Notification (Lieblingsgericht-Mail) ── */}
      <MensaNotifyForm />

      </div>
  );
}
