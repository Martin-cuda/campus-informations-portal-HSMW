// ──────────────────────────────────────────────────────────────────────────
// Kontakte.jsx
// Übersichts-Seite mit allen HSMW-Kontakten.
// Suche oben filtert serverseitig per ?q=, drunter eine A-Z Filter-Leiste
// um zu einem bestimmten Anfangsbuchstaben zu springen. Die Liste ist
// alphabetisch nach Nachname gruppiert (Telefonbuch-Stil).
// Klick auf eine Karte → /kontakt/:nutzerkuerzel mit Detaildaten.
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
// useSearchParams gibt uns Zugriff auf die URL-Query-Parameter (?q=...).
// Wir benutzen das damit der Suchbegriff in der URL liegt – dann bleibt er auch
// erhalten wenn der User auf einen Kontakt klickt und dann "Zurück" macht.
import { Link, useSearchParams } from "react-router-dom";
import { fetchContacts } from "../api/contacts";

// Alle Buchstaben des Alphabets – auch wenn nicht für jeden Kontakte da sind.
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Liefert den Sortier-Schlüssel für einen Kontakt: erster Buchstabe des Nachnamens
// (uppercase). Wenn kein Name da ist oder ein Sonderzeichen → "#".
function anfangsbuchstabe(contact) {
  const name = (contact?.name || contact?.displayname || "").trim();
  if (!name) return "#";
  // Umlaute auf Basis-Buchstaben mappen, damit "Ärger" unter "A" erscheint
  const ersterBuchstabe = name[0]
    .toUpperCase()
    .replace("Ä", "A")
    .replace("Ö", "O")
    .replace("Ü", "U");
  return /[A-Z]/.test(ersterBuchstabe) ? ersterBuchstabe : "#";
}

export default function Kontakte() {
  // Suchbegriff lebt in der URL als ?q=... – damit bleibt er beim Navigieren
  // zur Detail-Seite und wieder zurück erhalten. Wenn jemand /kontakt?q=mathe
  // bookmarkt, ist die Suche beim Wiederbesuch direkt gesetzt.
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const setQuery = (next) => {
    // Nur den q-Param setzen oder löschen – andere Params (falls's mal welche gibt)
    // bleiben erhalten. `replace: true` damit kein Browser-History-Müll entsteht.
    const neu = new URLSearchParams(searchParams);
    if (next) neu.set("q", next); else neu.delete("q");
    setSearchParams(neu, { replace: true });
  };

  // Volle Kontakt-Liste die das Backend gerade zurückgegeben hat
  const [contacts, setContacts] = useState([]);
  // Anzahl Treffer (für Anzeige unter dem Suchfeld)
  const [count, setCount]       = useState(0);
  // Status der Seite
  const [status, setStatus]     = useState("loading"); // loading | ok | error
  const [errorMsg, setErrMsg]   = useState("");
  // Aktuell ausgewählter Buchstabe ("" = alle anzeigen)
  const [letterFilter, setLetter] = useState("");

  // Backend-Aufruf bei Mount + bei Such-Änderung. Mit 250ms Debounce.
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setStatus((s) => (s === "ok" ? "ok" : "loading"));
      fetchContacts(query)
        .then(({ count, contacts }) => {
          if (ctrl.signal.aborted) return;
          setContacts(contacts);
          setCount(count);
          setStatus("ok");
          // Wenn sich die Liste neu lädt: Buchstaben-Filter zurücksetzen
          setLetter("");
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          setErrMsg(err.message || String(err));
          setStatus("error");
        });
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);

  // Anzahl Kontakte pro Anfangsbuchstabe (für die Chip-Beschriftung)
  const counterPerLetter = useMemo(() => {
    const c = {};
    contacts.forEach((k) => {
      const l = anfangsbuchstabe(k);
      c[l] = (c[l] || 0) + 1;
    });
    return c;
  }, [contacts]);

  // Gruppierte Liste: Map<Buchstabe, Kontakt[]>, sortiert alphabetisch
  const gruppen = useMemo(() => {
    const gefiltert = letterFilter
      ? contacts.filter((c) => anfangsbuchstabe(c) === letterFilter)
      : contacts;

    const map = new Map();
    gefiltert.forEach((c) => {
      const k = anfangsbuchstabe(c);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(c);
    });

    // Innerhalb jeder Gruppe nach Nachname → Vorname sortieren
    map.forEach((list) =>
      list.sort((a, b) => {
        const an = (a.name || "").localeCompare(b.name || "", "de");
        if (an !== 0) return an;
        return (a.gname || "").localeCompare(b.gname || "", "de");
      })
    );

    // Buchstaben aufsteigend, "#" am Ende
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });
  }, [contacts, letterFilter]);

  return (
    <div>
      {/* Header */}
      <div className="page-header fade-up">
        <div className="page-title">📞 Kontakte</div>
        <div className="page-subtitle">Mitarbeitende und Anlaufstellen · HS Mittweida</div>
      </div>

      {/* Such-Karte mit Eingabe und Trefferzahl */}
      <div className="card fade-up" style={{ marginBottom: 16 }}>
        <input
          className="login-input"
          type="search"
          placeholder="Suche nach Name, Titel, Bereich oder Durchwahl…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ marginBottom: 0 }}
          autoFocus
        />
        <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8" }}>
          {status === "ok"
            ? `${count} Treffer${query ? ` für „${query}"` : ""}`
            : status === "loading"
              ? "Wird geladen…"
              : ""}
        </div>

        {/* A-Z Sprung-Leiste – jeder Buchstabe ein Chip mit Counter.
            Buchstaben für die es keine Kontakte gibt sind ausgegraut und nicht klickbar. */}
        {status === "ok" && contacts.length > 0 && (
          <div className="filter-chips">
            <button
              type="button"
              className={"filter-chip" + (letterFilter === "" ? " active" : "")}
              onClick={() => setLetter("")}
            >
              Alle ({contacts.length})
            </button>
            {ALPHABET.map((l) => {
              const anzahl = counterPerLetter[l] || 0;
              const leer   = anzahl === 0;
              return (
                <button
                  key={l}
                  type="button"
                  className={
                    "filter-chip filter-chip-letter" +
                    (letterFilter === l ? " active" : "") +
                    (leer ? " disabled" : "")
                  }
                  onClick={() => !leer && setLetter(letterFilter === l ? "" : l)}
                  disabled={leer}
                  title={leer ? `Keine Kontakte mit ${l}` : `${anzahl} Kontakt(e) mit ${l}`}
                >
                  {l}
                </button>
              );
            })}
            {/* "#" für Sonderzeichen / Namen ohne Buchstabe als Anfang */}
            {counterPerLetter["#"] > 0 && (
              <button
                type="button"
                className={
                  "filter-chip filter-chip-letter" +
                  (letterFilter === "#" ? " active" : "")
                }
                onClick={() => setLetter(letterFilter === "#" ? "" : "#")}
                title={`${counterPerLetter["#"]} Kontakt(e) ohne Buchstabe als Anfang`}
              >
                #
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fehler-State */}
      {status === "error" && (
        <div className="state-box fade-up">
          <div className="state-box-icon">⚠️</div>
          <div className="state-box-text">
            Kontakte konnten nicht geladen werden.
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Empty-State */}
      {status === "ok" && contacts.length === 0 && (
        <div className="state-box fade-up">
          <div className="state-box-icon">🤷</div>
          <div className="state-box-text">
            {query ? "Keine Treffer." : "Keine Kontakte verfügbar."}
          </div>
        </div>
      )}

      {/* Gruppierte Anzeige – pro Buchstabe eine Section mit Counter + Karten-Grid */}
      {(status === "ok" || status === "loading") && contacts.length > 0 && gruppen.length > 0 && (
        <div className="fade-up">
          {gruppen.map(([buchstabe, list]) => (
            <section key={buchstabe} className="contact-group" id={`buchstabe-${buchstabe}`}>
              <div className="contact-group-head">
                <span className="contact-group-letter">{buchstabe}</span>
                <span className="contact-group-count">{list.length}</span>
              </div>
              <div className="contacts-grid">
                {list.map((c) => {
                  // Aktuelle Suche an die Detail-URL anhängen, damit der
                  // "Zurück"-Button auf der Detail-Seite den Filter wieder
                  // setzen kann. Ohne das wäre die Suche beim Zurückkommen weg.
                  const detailHref =
                    `/kontakt/${encodeURIComponent(c.id)}` +
                    (query ? `?q=${encodeURIComponent(query)}` : "");
                  return (
                    <Link
                      key={c.id}
                      to={detailHref}
                      className="contact-card"
                    >
                      <ContactAvatar src={c.picture} fallback={c.displayname || c.name} />
                      <div className="contact-meta">
                        <div className="contact-name">
                          {c.displayname || `${c.gname} ${c.name}`.trim() || "—"}
                        </div>
                        {c.title && <div className="contact-title">{c.title}</div>}
                        {c.companyphone && <div className="contact-phone">📞 {c.companyphone}</div>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Kreis-Avatar – wenn das Bild nicht laden mag, zeigen wir die Initialen.
 */
function ContactAvatar({ src, fallback }) {
  const [broken, setBroken] = useState(false);
  const initials = (fallback || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "?";

  if (!src || broken) {
    return <div className="contact-avatar contact-avatar-fallback">{initials}</div>;
  }
  return (
    <img
      className="contact-avatar"
      src={src}
      alt=""
      onError={() => setBroken(true)}
      loading="lazy"
    />
  );
}
