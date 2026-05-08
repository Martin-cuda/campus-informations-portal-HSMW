// ──────────────────────────────────────────────────────────────────────────
// api/contacts.js
// Kleine Helper-Schicht für die Kontakte-Endpoints des Backends.
// Komponenten importieren diese Funktionen statt direkt fetch() zu rufen –
// Vorteil: URL und Request-Details liegen an einer Stelle, leicht zu ändern.
//
// Backend-Endpoints (siehe backend/routers/kontakte.py):
//   GET /api/contacts/          → { count, contacts: [...] }
//   GET /api/contacts/?q=foo    → gefiltert per Suchbegriff
//   GET /api/contacts/{kuerzel} → einzelner Kontakt mit Detaildaten
// ──────────────────────────────────────────────────────────────────────────

// Basis-URL des Backend-Servers (Dev). Für Produktion müsste das eine
// Umgebungsvariable werden, fürs Studi-Setup ist localhost ok.
const API = "http://localhost:8000";

/**
 * Holt die Liste der Kontakte vom Backend.
 * @param {string} query  optionaler Suchbegriff – wird als ?q=... angehängt.
 *                        Backend filtert serverseitig.
 * @returns {Promise<{count: number, contacts: Array}>}
 */
export async function fetchContacts(query = "") {
  // URL-Klasse benutzen damit der Suchparameter sicher escaped wird
  // (Sonderzeichen, Leerzeichen, deutsche Umlaute etc.).
  const url = new URL(`${API}/api/contacts/`);
  if (query) url.searchParams.set("q", query);

  const r = await fetch(url.toString());
  if (!r.ok) throw new Error(`HTTP ${r.status}`);

  const data = await r.json();
  // Defensive Defaults falls das Backend mal kein count/contacts liefern sollte –
  // dann crasht das Frontend nicht, sondern zeigt halt 0 Treffer.
  return {
    count: data?.count ?? 0,
    contacts: Array.isArray(data?.contacts) ? data.contacts : [],
  };
}

/**
 * Holt die Detaildaten eines einzelnen Kontakts.
 * @param {string} kuerzel  Nutzerkürzel (z.B. "musterm1") – wird URL-encoded.
 */
export async function fetchContactDetail(kuerzel) {
  const r = await fetch(`${API}/api/contacts/${encodeURIComponent(kuerzel)}`);
  // Bei 404 wirft der Caller einen Error mit "HTTP 404" – die KontaktDetail-Seite
  // erkennt diesen Text-Inhalt und zeigt eine "nicht gefunden"-Meldung statt
  // einer generischen Fehlerbox.
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}
