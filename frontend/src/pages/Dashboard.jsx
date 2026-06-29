import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchNews } from "../api/news";
import { FACULTIES } from "./Faculties";

const API = "";
const TAG_KURZ_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MEALTYPE_LABELS = {
  R: "Rind",
  S: "Schwein",
  G: "GeflÃƒÂ¼gel",
  F: "Fisch",
  L: "Lamm",
  W: "Wild",
  V: "Vegetarisch",
  VG: "Vegan",
  A: "Alkohol",
  MI: "Mensa International",
};

const MODULE_TEXT = {
  mensa: "Speiseplan ansehen",
  raumfinder: "Freie RÃ¤ume finden",
  kontakt: "Mitarbeitende finden",
  news: "Aktuelle Meldungen",
};

function beschreibung(mod) {
  return MODULE_TEXT[mod.id] || "Modul Ã¶ffnen";
}

function begruessung() {
  const h = new Date().getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

function formatDate(value) {
  if (!value) return "";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
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

function formatTagKurz(unixSek) {
  if (!unixSek) return "?";
  return TAG_KURZ_DE[new Date(unixSek * 1000).getDay()] || "?";
}

function formatDatumKurz(unixSek) {
  if (!unixSek) return "";
  const d = new Date(unixSek * 1000);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

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

export default function Dashboard({ modules }) {
  const [w, setW] = useState({
    mensaGerichte: null,
    mensaKategorien: null,
    mensaDishes: [],
    raeumeFreie: null,
    raeumeGesamt: null,
    kontakteAnzahl: null,
    latestNews: [],
  });
  const [mensaTage, setMensaTage] = useState([]);
  const [mensaAktivIdx, setMensaAktivIdx] = useState(null);
  const [mensaPlanStatus, setMensaPlanStatus] = useState("loading");
  const [mensaPlanError, setMensaPlanError] = useState("");
  const [heroVideoPlaying, setHeroVideoPlaying] = useState(false);
  const mensaCarouselRef = useRef(null);
  const heroVideoRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/mensa/heute`)
      .then((r) => r.json())
      .then((data) => {
        const kategorien = data.kategorien || [];
        const menus = kategorien.flatMap((k) =>
          (k.menus || []).map((menu) => ({
            name: menu.name || menu.title || String(menu),
            category: k.name || k.kategorie || "Mensa",
          }))
        );
        setW((p) => ({
          ...p,
          mensaGerichte: menus.length,
          mensaKategorien: kategorien.length,
          mensaDishes: menus.slice(0, 3),
        }));
      })
      .catch(() => setW((p) => ({ ...p, mensaGerichte: "-" })));

    fetch(`${API}/api/haeuser/summary`)
      .then((r) => r.json())
      .then((data) => {
        setW((p) => ({ ...p, raeumeFreie: data.raeumeFreie, raeumeGesamt: data.raeumeGesamt }));
      })
      .catch(() => setW((p) => ({ ...p, raeumeFreie: "-" })));

    fetch(`${API}/api/contacts/count`)
      .then((r) => r.json())
      .then((data) => setW((p) => ({ ...p, kontakteAnzahl: data.count })))
      .catch(() => setW((p) => ({ ...p, kontakteAnzahl: "-" })));

    fetchNews()
      .then((items) => setW((p) => ({ ...p, latestNews: items.slice(0, 4) })))
      .catch(() => setW((p) => ({ ...p, latestNews: [] })));

    const ctrl = new AbortController();
    const idle = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 350));
    const cancelIdle = window.cancelIdleCallback || window.clearTimeout;
    const idleId = idle(() => {
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
            setMensaPlanStatus("empty");
            return;
          }

          setMensaTage(tageRaw);
          setMensaAktivIdx(null);
          setMensaPlanStatus("ok");
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          setMensaPlanError(err.message || String(err));
          setMensaPlanStatus("error");
        });
    });

    return () => {
      cancelIdle(idleId);
      ctrl.abort();
    };
  }, []);

  const aktiverMensaTag = useMemo(
    () => (mensaAktivIdx === null ? null : mensaTage[mensaAktivIdx] || null),
    [mensaTage, mensaAktivIdx]
  );

  const focusMensaCard = (index) => {
    const node = mensaCarouselRef.current;
    if (!node) return;
    const item = node.querySelector(`[data-day-index="${index}"]`);
    item?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const selectMensaDay = (index, allowToggle = true) => {
    const nextIndex = Math.max(0, Math.min(index, mensaTage.length - 1));
    if (allowToggle && mensaAktivIdx === nextIndex) {
      setMensaAktivIdx(null);
      return;
    }
    setMensaAktivIdx(nextIndex);
    window.requestAnimationFrame(() => focusMensaCard(nextIndex));
  };

  const shiftMensaDay = (direction) => {
    const fallbackIndex = direction > 0 ? 0 : mensaTage.length - 1;
    selectMensaDay(mensaAktivIdx === null ? fallbackIndex : mensaAktivIdx + direction, false);
  };

  const toggleHeroVideo = () => {
    const video = heroVideoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setHeroVideoPlaying(true)).catch(() => setHeroVideoPlaying(false));
    } else {
      video.pause();
      setHeroVideoPlaying(false);
    }
  };

  const heuteLabel = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const mensaWert =
    w.mensaGerichte === null ? "..."
    : w.mensaGerichte === "-" ? "Nicht erreichbar"
    : w.mensaGerichte === 0 ? "Kein Plan"
    : `${w.mensaGerichte}`;

  const raeumeWert =
    w.raeumeFreie === null ? "..."
    : w.raeumeFreie === "-" ? "Nicht erreichbar"
    : `${w.raeumeFreie}/${w.raeumeGesamt || 0}`;

  const kontakteWert =
    w.kontakteAnzahl === null ? "..."
    : w.kontakteAnzahl === "-" ? "Nicht erreichbar"
    : `${w.kontakteAnzahl}`;

  const availability =
    typeof w.raeumeFreie === "number" && w.raeumeGesamt
      ? Math.max(0, Math.min(100, (w.raeumeFreie / w.raeumeGesamt) * 100))
      : 0;

  const moduleById = new Map(modules.map((mod) => [mod.id, mod]));
  const newsModule = moduleById.get("news");
  const raumfinderModule = moduleById.get("raumfinder");
  const mensaModule = moduleById.get("mensa");
  const kontaktModule = moduleById.get("kontakt");
  // [FIX Claude] Eigene/zugebuchte Module (alles ausser den 4 Kernmodulen)
  const CORE_IDS = ["hochschule", "fakultaeten", "news", "mensa", "raumfinder", "kontakt"];
  const extraTiles = (modules || []).filter((m) => !CORE_IDS.includes(m.id));
  const previewNews = w.latestNews.slice(0, 4);

  return (
    <div className="dashboard-page uchicago-home">
      <section className="uchicago-hero" aria-label="Startseite">
        <button
          type="button"
          className={"uchicago-play" + (heroVideoPlaying ? " is-playing" : "")}
          onClick={toggleHeroVideo}
          aria-label={heroVideoPlaying ? "Video anhalten" : "Video abspielen"}
          title={heroVideoPlaying ? "Video anhalten" : "Video abspielen"}
        />
        <video
          ref={heroVideoRef}
          className="uchicago-hero-video"
          src="/Videobttrhsmw.mp4"
          autoPlay
          preload="metadata"
          poster="/Campusfoto.jpg"
          muted
          loop
          playsInline
          onPlay={() => setHeroVideoPlaying(true)}
          onPause={() => setHeroVideoPlaying(false)}
        />
      </section>

      <section className="mobile-cta-band" aria-label="Schnelle Aktionen">
        <Link to="/news" className="mobile-cta-card">
          <strong>Neuigkeiten</strong>
          <span>Aktuelle Meldungen lesen</span>
        </Link>
        <Link to="/mensa" className="mobile-cta-card">
          <strong>Mensa heute</strong>
          <span>{mensaWert === "..." ? "Speiseplan laden" : `${mensaWert} Gerichte`}</span>
        </Link>
        <Link to="/raumfinder" className="mobile-cta-card">
          <strong>Raumfinder</strong>
          <span>{raeumeWert === "..." ? "Freie Räume finden" : `${raeumeWert} frei`}</span>
        </Link>
      </section>

      <section className="mobile-campus-utility" aria-label="Campus-Übersicht">
        <Link to="/mensa" className="mobile-utility-card">
          <span>Mensa</span>
          <strong>{mensaWert}</strong>
          <small>Speiseplan öffnen</small>
        </Link>
        <Link to="/raumfinder" className="mobile-utility-card">
          <span>Raumfinder</span>
          <strong>{raeumeWert}</strong>
          <small>Räume anzeigen</small>
        </Link>
        <Link to="/kontakt" className="mobile-utility-card">
          <span>Kontakt</span>
          <strong>{kontakteWert}</strong>
          <small>Verzeichnis öffnen</small>
        </Link>
      </section>

      <nav className="faculty-strip" aria-label="FakultÃ¤ten">
        {FACULTIES.map((faculty) => (
          <a
            key={faculty.id}
            href={faculty.url}
            className="faculty-strip-item"
            style={{ "--faculty-color": faculty.color }}
          >
            {faculty.label}
          </a>
        ))}
      </nav>

      <section className="home-news-preview" aria-label="Aktuelle Meldungen">
        <div className="latest-news-title">
          <h2>AKTUELLE MELDUNGEN</h2>
          <span />
        </div>
        {previewNews.length > 0 && (
          <>
            <div className="home-news-grid">
              {previewNews.map((item) => (
                <Link to="/news" className="home-news-card" key={item.id || item.title}>
                  <div className="home-news-image">
                    <img src={item.image || "/Campusfoto.jpg"} alt="" />
                  </div>
                  <div className="home-news-body">
                    <h3>{item.title}</h3>
                    <p>{item.teaser || item.category || "Aktuelle Meldung der Hochschule Mittweida"}</p>
                  </div>
                </Link>
              ))}
            </div>
            <Link to="/news" className="home-news-more">Weitere Meldungen ansehen</Link>
          </>
        )}
      </section>

      <section className="home-mensa-preview" aria-label="Mensa Speiseplan">
        <div className="latest-news-title">
          <h2>MENSA</h2>
          <span />
        </div>

        {mensaPlanStatus === "loading" && (
          <div className="state-box">
            <div className="state-box-text">Speiseplan wird geladen...</div>
          </div>
        )}

        {mensaPlanStatus === "error" && (
          <div className="state-box">
            <div className="state-box-text">
              Speiseplan konnte nicht geladen werden.
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{mensaPlanError}</div>
            </div>
          </div>
        )}

        {mensaPlanStatus === "empty" && (
          <div className="state-box">
            <div className="state-box-text">Aktuell ist kein Speiseplan verfÃƒÂ¼gbar.</div>
          </div>
        )}

        {mensaPlanStatus === "ok" && (
          <>
            <div className="day-carousel-shell home-day-carousel">
              <button type="button" className="day-carousel-control" onClick={() => shiftMensaDay(-1)} aria-label="Vorherige Tage" />
              <div className="day-carousel" ref={mensaCarouselRef} aria-label="Tage im Speiseplan">
                <div className="day-tabs">
                  {mensaTage.map((tag, index) => {
                    const heute = isHeute(tag.datum_raw);
                    const aktiv = index === mensaAktivIdx;
                    const label = formatTagKurz(tag.datum_raw);
                    return (
                      <button
                        key={tag.datum_raw ?? index}
                        data-day-index={index}
                        data-day-label={label}
                        className={"day-tab" + (aktiv ? " active" : "")}
                        onClick={() => selectMensaDay(index)}
                      >
                        <span className="day-tab-name">{label}</span>
                        <span className="day-tab-date">{formatDatumKurz(tag.datum_raw)}</span>
                        {heute && <span className="day-tab-pill">heute</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button type="button" className="day-carousel-control" onClick={() => shiftMensaDay(1)} aria-label="NÃƒÂ¤chste Tage" />
            </div>

            {aktiverMensaTag && (
              <div className="home-mensa-menu">
                <div className="day-header">{formatDatumLang(aktiverMensaTag.datum_raw)}</div>

                {(aktiverMensaTag.kategorien || []).length === 0 && (
                  <div className="state-box">
                    <div className="state-box-text">FÃƒÂ¼r diesen Tag gibt es keinen Speiseplan.</div>
                  </div>
                )}

                {(aktiverMensaTag.kategorien || []).map((kat, ki) => (
                  <section key={ki} className="meal-section">
                    <div className="meal-section-title">{kat.titel || "Speisen"}</div>
                    <div className="meal-grid">
                      {(kat.menus || []).map((meal, mi) => {
                        const aktiv = meal.active !== false;
                        return (
                          <div className={"meal-card" + (aktiv ? "" : " meal-card-unavailable")} key={meal.id ?? mi} aria-disabled={!aktiv}>
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
                                <span className="badge badge-unavailable">
                                  Nicht verfÃƒÂ¼gbar
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </section>

    </div>
  );
}
