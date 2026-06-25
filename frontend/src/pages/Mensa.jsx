import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import MensaNotifyForm from "../components/MensaNotifyForm";

const API = "";

const TAG_KURZ_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

const MEALTYPE_LABELS = {
  R: "Rind",
  S: "Schwein",
  G: "Geflügel",
  F: "Fisch",
  L: "Lamm",
  W: "Wild",
  V: "Vegetarisch",
  VG: "Vegan",
  A: "Alkohol",
  MI: "Mensa International",
};

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

function formatTagKurz(unixSek) {
  if (!unixSek) return "?";
  return TAG_KURZ_DE[new Date(unixSek * 1000).getDay()] || "?";
}

function formatDatumKurz(unixSek) {
  if (!unixSek) return "";
  const d = new Date(unixSek * 1000);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function tagesAnfang(date = new Date()) {
  const x = new Date(date);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isHeute(unixSek) {
  if (!unixSek) return false;
  const d = new Date(unixSek * 1000);
  const h = new Date();
  return d.getFullYear() === h.getFullYear() && d.getMonth() === h.getMonth() && d.getDate() === h.getDate();
}

export default function Mensa() {
  const [tage, setTage] = useState([]);
  const [aktivIdx, setAktiv] = useState(0);
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrMsg] = useState("");
  const carouselRef = useRef(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API}/api/mensa/`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const heute0 = tagesAnfang();
        const tageRaw = (Array.isArray(data?.tage) ? data.tage : [])
          .filter((t) => new Date((t.datum_raw || 0) * 1000) >= heute0);

        if (tageRaw.length === 0) {
          setStatus("empty");
          return;
        }

        setTage(tageRaw);
        const heuteIdx = tageRaw.findIndex((t) => isHeute(t.datum_raw));
        setAktiv(heuteIdx >= 0 ? heuteIdx : 0);
        setStatus("ok");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setErrMsg(err.message || String(err));
        setStatus("error");
      });

    return () => ctrl.abort();
  }, []);

  const aktiverTag = useMemo(() => tage[aktivIdx] || null, [tage, aktivIdx]);

  const focusCarouselItem = (index) => {
    const node = carouselRef.current;
    if (!node) return;
    const item = node.querySelector(`[data-day-index="${index}"]`);
    item?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const selectDay = (index) => {
    const nextIndex = Math.max(0, Math.min(index, tage.length - 1));
    setAktiv(nextIndex);
    window.requestAnimationFrame(() => focusCarouselItem(nextIndex));
  };

  const scrollCarousel = (direction) => {
    selectDay(aktivIdx + direction);
  };

  return (
    <div>
      <div className="page-header module-header module-mensa fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="page-title">Mensa</div>
          <div className="page-subtitle">Speiseplan · HS Mittweida</div>
        </div>
        <Link to="/mensa/legende" className="btn-secondary" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>
          Legende
        </Link>
      </div>

      {status === "loading" && (
        <div className="state-box fade-up">
          <div className="state-box-text">Speiseplan wird geladen...</div>
        </div>
      )}

      {status === "error" && (
        <div className="state-box fade-up">
          <div className="state-box-text">
            Speiseplan konnte nicht geladen werden.
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{errorMsg}</div>
          </div>
        </div>
      )}

      {status === "empty" && (
        <div className="state-box fade-up">
          <div className="state-box-text">Aktuell ist kein Speiseplan verfügbar.</div>
        </div>
      )}

      {status === "ok" && (
        <>
          <div className="day-carousel-shell fade-up">
            <button type="button" className="day-carousel-control" onClick={() => scrollCarousel(-1)} aria-label="Vorherige Tage">
              ‹
            </button>
            <div className="day-carousel" ref={carouselRef} aria-label="Tage im Speiseplan">
              <div className="day-tabs">
                {tage.map((t, i) => {
                  const heute = isHeute(t.datum_raw);
                  const aktiv = i === aktivIdx;
                  return (
                    <button
                      key={t.datum_raw ?? i}
                      data-day-index={i}
                      data-day-label={formatTagKurz(t.datum_raw)}
                      className={"day-tab" + (aktiv ? " active" : "")}
                      onClick={() => selectDay(i)}
                    >
                      <span className="day-tab-name">{formatTagKurz(t.datum_raw)}</span>
                      <span className="day-tab-date">{formatDatumKurz(t.datum_raw)}</span>
                      {heute && <span className="day-tab-pill">heute</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="button" className="day-carousel-control" onClick={() => scrollCarousel(1)} aria-label="Nächste Tage">
              ›
            </button>
          </div>

          <div className="day-header fade-up">{formatDatumLang(aktiverTag?.datum_raw)}</div>

          {(aktiverTag?.kategorien || []).length === 0 && (
            <div className="state-box fade-up">
              <div className="state-box-text">Für diesen Tag gibt es keinen Speiseplan.</div>
            </div>
          )}

          {(aktiverTag?.kategorien || []).map((kat, ki) => (
            <section key={ki} className="meal-section fade-up">
              <div className="meal-section-title">{kat.titel || "Speisen"}</div>
              <div className="meal-grid">
                {(kat.menus || []).map((meal, mi) => {
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

                      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {aktiv ? (
                          (meal.mealtypes || []).map((mt, ti) => {
                            const code = String(mt);
                            const label = MEALTYPE_LABELS[code];
                            return (
                              <span key={ti} className="badge badge-gray" title={label || code}>
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

      <MensaNotifyForm />
    </div>
  );
}
