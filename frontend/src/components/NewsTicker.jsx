import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchNews } from "../api/news";

// Ruhiges Tempo in Pixel pro Sekunde (unabhaengig von der Anzahl Meldungen).
// [Claude] Langsamer gestellt, damit das Laufband entspannter wirkt.
const PX_PER_SEC = 30;

// Dezentes News-Laufband fuer die blaue Leiste ganz oben.
// - laedt die aktuellen Meldungen (neueste zuerst)
// - misst die Breite einer Titel-"Bahn" und wiederholt sie so oft, dass die
//   Leiste IMMER ueber die volle Breite gefuellt ist (nicht nur links)
// - die Animation verschiebt um exakt EINE Bahn -> echter nahtloser Loop,
//   kein Ruckeln/Sprung beim Umbruch
// - Pause bei Hover/Fokus, respektiert "prefers-reduced-motion"
// - blendet sich komplett aus, wenn es keine News gibt
export default function NewsTicker() {
  const [titles, setTitles] = useState([]);
  const viewportRef = useRef(null);
  const setRef = useRef(null);
  const [setWidth, setSetWidth] = useState(0);
  const [copies, setCopies] = useState(3);
  // [Claude] Steuert das Laufen/Anhalten des Laufbands (Knopf links).
  const [running, setRunning] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchNews()
      .then((items) => {
        if (cancelled) return;
        const sorted = [...items].sort((a, b) =>
          String(b.date || "").localeCompare(String(a.date || ""))
        );
        const next = sorted
          .map((n) => (n.title || "").trim())
          .filter(Boolean)
          .slice(0, 12);
        setTitles(next);
      })
      .catch(() => {
        /* Backend offline o. keine News -> Leiste bleibt unsichtbar */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Eine Bahn vermessen und genug Kopien bestimmen, damit die Leiste voll ist.
  useLayoutEffect(() => {
    const measure = () => {
      const vp = viewportRef.current;
      const oneSet = setRef.current;
      if (!vp || !oneSet) return;
      const w = oneSet.scrollWidth;
      if (!w) return;
      setSetWidth(w);
      const vpW = vp.clientWidth || 0;
      // +1 Kopie Reserve, mind. 2 -> waehrend der Verschiebung nie eine Luecke
      setCopies(Math.max(2, Math.ceil(vpW / w) + 1));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [titles]);

  if (titles.length === 0) return null;

  const durationSec = setWidth ? Math.max(24, setWidth / PX_PER_SEC) : 50;

  const TickerSet = ({ first }) => (
    <div
      className="news-ticker-set"
      ref={first ? setRef : undefined}
      aria-hidden={first ? undefined : "true"}
    >
      {titles.map((text, i) => (
        <Link
          to="/news"
          className="news-ticker-item"
          key={i}
          tabIndex={first ? undefined : -1}
        >
          <span className="news-ticker-dot" aria-hidden="true" />
          <span className="news-ticker-text">{text}</span>
        </Link>
      ))}
    </div>
  );

  return (
    <div
      className={"news-ticker" + (running ? "" : " news-ticker-paused")}
      role="region"
      aria-label="Aktuelle Neuigkeiten"
    >
      {/* [Claude] Knopf links schaltet das Laufband an/aus (statt zu /news zu springen). */}
      <button
        type="button"
        className="news-ticker-label"
        onClick={() => setRunning((r) => !r)}
        aria-pressed={!running}
        aria-label={running ? "Laufband anhalten" : "Laufband starten"}
        title={running ? "Laufband anhalten" : "Laufband starten"}
      >
        <span className="news-ticker-toggle-icon" aria-hidden="true">{running ? "❚❚" : "▶"}</span>
      </button>
      <div className="news-ticker-viewport" ref={viewportRef}>
        <div
          className="news-ticker-track"
          style={{
            animationDuration: `${durationSec}s`,
            "--ticker-shift": `${setWidth}px`,
          }}
        >
          {Array.from({ length: copies }).map((_, k) => (
            <TickerSet key={k} first={k === 0} />
          ))}
        </div>
      </div>
    </div>
  );
}
