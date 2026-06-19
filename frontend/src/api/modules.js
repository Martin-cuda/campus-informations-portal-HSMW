// ──────────────────────────────────────────────────────────────────────────
// api/modules.js
// Helper-Schicht für die Module-Endpoints des Backends.
// Komponenten rufen diese Funktionen statt direkt fetch() – so bleibt die
// Anbindung an einer Stelle zentralisiert.
//
// Backend-Endpoints (siehe backend/routers/modules.py):
//   GET    /api/modules/         → Liste aller persistierten Module
//   POST   /api/modules/         → Modul hinzufügen oder aktualisieren (upsert)
//   DELETE /api/modules/{id}     → Modul löschen
//
// Die Module liegen serverseitig in backend/data/modules.json, sind also
// persistent und für alle User des Portals gleich – kein localStorage,
// kein Browser-Storage.
// ──────────────────────────────────────────────────────────────────────────

// Basis-URL des Backend-Servers (Dev). In Produktion → Umgebungsvariable.
const API = "";

// [MERGE] Hängt den Admin-Token (falls vorhanden) als Bearer-Header an.
function authHeaders(extra = {}) {
  const h = { ...extra };
  try {
    const t = sessionStorage.getItem("token");
    if (t) h["Authorization"] = "Bearer " + t;
  } catch { /* noop */ }
  return h;
}

/**
 * Lädt alle aktivierten Extra-Module vom Backend.
 * Wirft, wenn das Backend nicht erreichbar ist – wird in App.jsx gefangen
 * und als console.warn ausgegeben (App läuft trotzdem ohne Extra-Module weiter).
 */
export async function fetchExtraModules() {
  const r = await fetch(`${API}/api/modules/`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  // Defensive: falls das Backend mal kein Array liefert (Bug, leeres File),
  // geben wir ein leeres Array zurück damit die UI nicht crasht.
  return Array.isArray(data) ? data : [];
}

/**
 * Speichert ein Modul auf dem Server (Upsert: gibt es schon eins mit der id,
 * wird's überschrieben – sonst neu angelegt).
 *
 * Body = das komplette Modul-Objekt:
 *   { id, label, icon, path, tag, description, color, banner, sections, links }
 */
export async function persistExtraModule(mod) {
  const r = await fetch(`${API}/api/modules/`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(mod),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}

/**
 * Löscht ein Modul auf dem Server. Gibt { deleted: id } zurück, wirft bei Fehler.
 * id wird URL-encoded falls sie Sonderzeichen enthalten sollte.
 */
export async function deleteExtraModule(id) {
  const r = await fetch(`${API}/api/modules/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}

// [MERGE] Reihenfolge der Zusatz-Module speichern (Admin: Verschieben).
export async function reorderExtraModules(ids) {
  const r = await fetch(`${API}/api/modules/order`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ ids }),
  });
  if (!r.ok) throw new Error("REORDER");
  return r.json();
}
