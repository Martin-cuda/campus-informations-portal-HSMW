// ──────────────────────────────────────────────────────────────────────────
// KontaktDetail.jsx
// Detail-Seite für einen einzelnen Kontakt.
// URL: /kontakt/:nutzerkuerzel  (z.B. /kontakt/musterm1)
// Holt die Detaildaten über fetchContactDetail vom Backend und zeigt sie
// strukturiert an (großer Avatar, Name, Titel, Org, dann ein Feld-Grid).
// ──────────────────────────────────────────────────────────────────────────

// useState für lokalen Komponenten-State, useEffect für API-Call beim Mount/Param-Wechsel
import { useEffect, useState } from "react";
// Link für den Zurück-Button, useParams um den :nutzerkuerzel aus der URL zu lesen,
// useSearchParams um den ?q=...-Parameter aus der URL zu lesen (für die Suche-Persistenz)
import { Link, useParams, useSearchParams } from "react-router-dom";
// API-Call kapselt der Helper – Datei: src/api/contacts.js
import { fetchContactDetail } from "../api/contacts";

export default function KontaktDetail() {
  // useParams liest die URL-Parameter aus der Route-Definition. In App.jsx haben wir
  // den Pfad `/kontakt/:nutzerkuerzel` definiert, also gibt's hier nutzerkuerzel.
  const { nutzerkuerzel } = useParams();

  // ?q=... aus der URL lesen – wurde von der Liste mitgegeben damit wir den
  // Suchbegriff beim Zurück-Klick wieder setzen können.
  const [searchParams] = useSearchParams();
  const backQuery = searchParams.get("q") || "";
  const backHref  = "/kontakt" + (backQuery ? `?q=${encodeURIComponent(backQuery)}` : "");

  // contact = das volle Detail-Objekt vom Backend
  const [contact, setContact] = useState(null);
  // status steuert was wir zeigen: spinner, daten, "nicht gefunden", oder Fehler
  const [status, setStatus]   = useState("loading"); // loading | ok | error | notfound
  // errorMsg wird kleingedruckt im Error-State angezeigt (technische Detail-Meldung)
  const [errorMsg, setErrMsg] = useState("");

  // Effect läuft jedes Mal wenn sich nutzerkuerzel ändert (also wenn der User
  // auf einer Detail-Seite "Zurück" und dann eine andere Karte klickt).
  useEffect(() => {
    const ctrl = new AbortController();
    setStatus("loading");

    fetchContactDetail(nutzerkuerzel)
      .then((data) => {
        if (ctrl.signal.aborted) return;
        setContact(data);
        setStatus("ok");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        // Backend wirft 404 als Error mit "HTTP 404" im Text → spezieller State
        // damit wir eine schönere "nicht gefunden"-Meldung zeigen können statt
        // einer generischen Fehlerbox.
        if (String(err.message).includes("404")) {
          setStatus("notfound");
        } else {
          setErrMsg(err.message || String(err));
          setStatus("error");
        }
      });

    return () => ctrl.abort();
  }, [nutzerkuerzel]);

  return (
    <div>
      {/* Header oben mit Titel links und Zurück-Button rechts */}
      <div className="page-header fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="page-title">📞 Kontaktdetails</div>
          <div className="page-subtitle">HS Mittweida</div>
        </div>
        <Link to={backHref} className="btn-secondary" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>
          ← Zurück zur Liste
        </Link>
      </div>

      {/* Lade-Anzeige während die Anfrage läuft */}
      {status === "loading" && (
        <div className="state-box fade-up">
          <div className="state-box-icon">⏳</div>
          <div className="state-box-text">Kontakt wird geladen…</div>
        </div>
      )}

      {/* 404 vom Backend → freundlichere Meldung */}
      {status === "notfound" && (
        <div className="state-box fade-up">
          <div className="state-box-icon">🤷</div>
          <div className="state-box-text">Kontakt nicht gefunden.</div>
        </div>
      )}

      {/* Allgemeiner Fehler-State (Backend offline o.ä.) */}
      {status === "error" && (
        <div className="state-box fade-up">
          <div className="state-box-icon">⚠️</div>
          <div className="state-box-text">
            Konnte den Kontakt nicht laden.
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Erfolgsfall – die eigentlichen Detaildaten */}
      {status === "ok" && contact && (
        <div className="card fade-up contact-detail">
          {/* Kopfbereich: großes Avatar + Name + Titel + Org */}
          <div className="contact-detail-head">
            <ContactAvatar src={contact.picture} fallback={contact.displayname || contact.name} large />
            <div>
              <div className="contact-detail-name">
                {contact.displayname || `${contact.gname} ${contact.name}`.trim() || "—"}
              </div>
              {contact.title && <div className="contact-detail-title">{contact.title}</div>}
              {contact.org   && <div className="contact-detail-org">{contact.org}</div>}
            </div>
          </div>

          {/* Feld-Grid mit allen weiteren Angaben.
              Die Field-Komponente unten überspringt automatisch leere Werte. */}
          <div className="contact-detail-grid">
            <Field label="Nutzerkürzel" value={contact.id} mono />
            <Field label="Vorname"      value={contact.gname} />
            <Field label="Nachname"     value={contact.name} />
            {/* E-Mail bekommt einen mailto:-Link, Telefon einen tel:-Link */}
            <Field label="E-Mail"       value={contact.email} link={contact.email ? `mailto:${contact.email}` : null} />
            <Field label="Telefon"      value={contact.phone} link={contact.phone ? `tel:${contact.phone}` : null} />
            <Field label="Durchwahl"    value={contact.companyphone} />
            <Field label="Gebäude"      value={contact.housename} />
            <Field label="Raum"         value={contact.roomname} />
            <Field label="Bereich"      value={contact.structure} />
            <Field label="Adresse"      value={contact.address} />
            <Field label="Webseite"     value={contact.url}   link={contact.url || null} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Ein einzelnes Feld im Detail-Grid.
 * Wenn `value` leer ist, rendert die Komponente nichts → leere Felder
 * tauchen gar nicht erst im Layout auf.
 *
 * `link` (optional) macht aus dem Wert einen Link (mailto, tel, https…).
 * `mono` (optional) zeigt den Wert in Monospace-Font (für IDs/Kürzel sinnvoll).
 */
function Field({ label, value, link, mono }) {
  if (!value) return null;

  // Wenn ein Link da ist: <a>-Tag drumherum bauen.
  // Externe https-Links öffnen wir in einem neuen Tab (target="_blank").
  // mailto/tel öffnen direkt das passende Programm – kein new tab nötig.
  const content = link
    ? <a href={link} target={link.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{value}</a>
    : value;

  return (
    <div className="contact-field">
      <div className="contact-field-label">{label}</div>
      <div className={"contact-field-value" + (mono ? " contact-field-mono" : "")}>{content}</div>
    </div>
  );
}

/**
 * Großer kreisförmiger Avatar für die Detail-Seite (oder kleiner, wenn `large` weggelassen).
 * Selbe Logik wie in Kontakte.jsx – wenn das Bild fehlt oder nicht laden mag,
 * zeigen wir die Initialen aus dem Fallback-Text. Datei-internes Duplikat um
 * keine extra Module-Datei nur dafür anzulegen.
 */
function ContactAvatar({ src, fallback, large }) {
  const [broken, setBroken] = useState(false);

  const initials = (fallback || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "?";

  const cls = "contact-avatar" + (large ? " contact-avatar-large" : "");
  if (!src || broken) {
    return <div className={cls + " contact-avatar-fallback"}>{initials}</div>;
  }
  return <img className={cls} src={src} alt="" onError={() => setBroken(true)} />;
}
