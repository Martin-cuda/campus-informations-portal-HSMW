// ──────────────────────────────────────────────────────────────────────────
// api/mensaNotify.js  – Ari (Ticket 3: Lieblingsgericht-Mail)
// Helper für /api/mensa/notify-Endpoints.
//   POST /api/mensa/notify/subscribe  { email, keyword }
// Confirm + Unsubscribe sind GET-Links die direkt aus der E-Mail klickt
// werden, dafür braucht das Frontend keinen API-Call.
// ──────────────────────────────────────────────────────────────────────────

// Relativ -> selber Origin: im Dev ueber den Vite-Proxy (/api -> 127.0.0.1:8000),
// in Prod ueber den Caddy-Proxy. Kein hartes localhost:8000 (sonst kaputt beim Hosten).
const API = "";

/**
 * Legt ein neues Abo an (oder aktualisiert ein bestehendes auf der gleichen
 * Mail). Backend versendet danach eine Bestätigungs-Mail. Erst nach Klick
 * auf den Confirm-Link sind die Benachrichtigungen aktiv.
 *
 * Wirft Error("BAD_INPUT") bei 400, Error("HTTP <code>") sonst.
 */
export async function subscribeMensaNotify({ email, keyword }) {
  const r = await fetch(`${API}/api/mensa/notify/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, keyword }),
  });
  if (r.status === 400 || r.status === 422) {
    let detail = "";
    try { const j = await r.json(); detail = j?.detail || ""; } catch {}
    const e = new Error("BAD_INPUT");
    e.detail = detail || "Bitte E-Mail und Stichwort prüfen.";
    throw e;
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
