// ──────────────────────────────────────────────────────────────────────────
// api/admin.js  – Ari (Ticket 2: Admin Dashboard)
// Helper-Schicht für die /api/admin/metrics-Endpoints.
// Jeder Request schickt den JWT (sessionStorage.token) als Bearer-Auth mit.
// Backend-Endpoints (siehe backend/routers/admin_metrics.py):
//   GET /api/admin/metrics/summary
//   GET /api/admin/metrics/by-hour
//   GET /api/admin/metrics/top-endpoints
//   GET /api/admin/metrics/errors
//   GET /api/admin/metrics/recent
// ──────────────────────────────────────────────────────────────────────────

const API = "http://localhost:8000";

/**
 * Holt den JWT aus sessionStorage – wird vom AdminLogin dort hinterlegt.
 * Wenn kein Token da ist, geben wir null zurück und der Aufrufer kann
 * den User zum Login schicken.
 */
function getToken() {
  try {
    return sessionStorage.getItem("token");
  } catch {
    return null;
  }
}

/** Wirft "AUTH" wenn kein Token da ist, sonst Bearer-Header. */
function authHeaders() {
  const t = getToken();
  if (!t) throw new Error("AUTH");
  return { Authorization: `Bearer ${t}` };
}

/** Generischer GET-Wrapper für Admin-Endpoints. */
async function getJson(path) {
  const r = await fetch(`${API}${path}`, { headers: authHeaders() });
  if (r.status === 401 || r.status === 403) throw new Error("AUTH");
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export function fetchMetricsSummary()      { return getJson("/api/admin/metrics/summary");       }
export function fetchMetricsByHour()       { return getJson("/api/admin/metrics/by-hour");       }
export function fetchMetricsTopEndpoints() { return getJson("/api/admin/metrics/top-endpoints"); }
export function fetchMetricsErrors()       { return getJson("/api/admin/metrics/errors");        }
export function fetchMetricsRecent()       { return getJson("/api/admin/metrics/recent?limit=25");}

/** Prüft ohne Backend-Call, ob aktuell jemand eingeloggt sein KÖNNTE. */
export function hasToken() {
  return !!getToken();
}

/** Sichtbares Logout: Token raus, AdminLogin-Seite kann danach genutzt werden. */
export function logoutAdmin() {
  try {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("token_type");
  } catch {/* noop */}
}
