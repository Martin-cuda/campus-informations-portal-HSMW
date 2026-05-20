// ── ARI (ORIGINAL – Basis) + JEROME (echte JWT-Auth) ─────────────────────
//
// [MERGE: Claude] Ari's AdminLogin.jsx als Basis. Die Mock-Login-Logik
// (hardcoded admin/hsmw2025) wurde durch einen echten Call an Jerome's
// /login-Endpoint ersetzt. Das JWT-Token wird im sessionStorage gespeichert.
// Bei Backend-Ausfall fällt die Seite auf den Demo-Modus zurück.
//
// Änderungen gegenüber Ari's Original:
//   1. handleLogin ist jetzt async und ruft POST /login auf (Jerome)
//   2. JWT-Token wird in sessionStorage.setItem("token", ...) gespeichert
//   3. Fehlerbehandlung für Netzwerkfehler (Backend offline)
//   4. Mock-Fallback bleibt erhalten für den Fall dass Backend offline ist
// ──────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:8000";

// [MERGE: Claude] Demo-Fallback Credentials (Ari's Original) – werden nur
// benutzt wenn der Backend-Server nicht erreichbar ist.
const DEMO_USER = "admin";
const DEMO_PASS = "hsmw2025";

export default function AdminLogin() {
  // ── ARI: State (unverändert) ───────────────────────────────────────────
  const [user, setUser]       = useState("");
  const [pass, setPass]       = useState("");
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const [recoveryUser, setRecoveryUser] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMsg, setRecoveryMsg] = useState("");
  // [MERGE: Claude] Neu: loading-State damit der Button während des Requests disabled ist
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const navigate = useNavigate();

  // ── [MERGE: Claude] Login-Logik: zuerst Jerome's Backend, dann Demo-Fallback ──
  const handleLogin = async () => {
    if (!user.trim() || !pass.trim()) {
      setError("Bitte Benutzername und Passwort eingeben.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // ── JEROME: POST /login mit Query-Parametern (Jerome's API-Format) ──
      const url = new URL(`${API}/login`);
      url.searchParams.set("name", user);
      url.searchParams.set("password", pass);

      const r = await fetch(url.toString(), { method: "POST" });

      if (r.ok) {
        // ── JEROME: JWT-Token aus Antwort speichern ──────────────────────
        const data = await r.json();
        sessionStorage.setItem("token", data.access_token);
        sessionStorage.setItem("token_type", data.token_type);
        setSuccess(true);
        setTimeout(() => navigate("/"), 1200);
        return;
      }

      // Backend erreichbar aber Credentials falsch (401)
      if (r.status === 401) {
        setError("Benutzername oder Passwort falsch.");
        return;
      }

      setError(`Server-Fehler: HTTP ${r.status}`);
    } catch {
      // ── [MERGE: Claude] Fallback: Backend offline → Demo-Modus ─────────
      // Wenn Jerome's Backend nicht läuft, weichen wir auf die hardcodierten
      // Demo-Credentials zurück damit das Frontend trotzdem testbar bleibt.
      if (user === DEMO_USER && pass === DEMO_PASS) {
        sessionStorage.setItem("token", "demo-token");
        setSuccess(true);
        setTimeout(() => navigate("/"), 1200);
      } else {
        setError("Backend nicht erreichbar. Demo: admin / hsmw2025");
      }
    } finally {
      setLoading(false);
    }
  };

const handleForgotPassword = async () => {
  if (!recoveryUser.trim()) {
    setRecoveryMsg("Bitte Benutzername eingeben.");
    return;
  }

  setRecoveryLoading(true);
  setRecoveryMsg("");

  try {
    const res = await fetch("http://127.0.0.1:8000/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: recoveryUser
      })
    });

    const data = await res.json();

    console.log("Recovery response:", data);

    setRecoveryMsg("Falls der Account existiert, wurde eine E-Mail gesendet.");

  } catch (err) {
    setRecoveryMsg("Server nicht erreichbar.");
  } finally {
    setRecoveryLoading(false);
  }
};

  // ── ARI: Enter-Key Handler (unverändert) ──────────────────────────────
  const handleKey = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  // ── ARI: JSX (fast unverändert – nur loading-State am Button) ─────────
  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">Admin Login</div>
        <div className="page-subtitle">Nur für autorisierte Benutzer</div>
      </div>

      <div className="login-wrap fade-up">
        <div className="card">
          {success ? (
            <div className="state-box">
              <div className="state-box-text" style={{ color: "#16a34a" }}>
                Login erfolgreich – Weiterleitung…
              </div>
            </div>
          ) : showRecovery ? (
            <>
               <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    Passwort zurücksetzen
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}> 
                    Admin Nutzername eingeben
                  </div>
                </div>

                <label className="login-label">Nutzername</label>
                <input
                  className="login-input"
                  type="text"
                  placeholder="Nutzername"
                  value={recoveryUser}
                  onChange={(e) => setRecoveryUser(e.target.value)}
                />

            <button
              className="btn-primary"
              onClick={handleForgotPassword}
              disabled={recoveryLoading}
              style={{ opacity: recoveryLoading ? 0.7 : 1 }}
            >
              {recoveryLoading
                ? "Wird gesendet..."
                : "Reset-Link senden"}
            </button>

            {recoveryMsg && (
              <div
                className="login-error"
                style={{ marginTop: 10 }}
              >
                {recoveryMsg}
              </div>
            )}

            <button
              className="btn-secondary"
              onClick={() => setShowRecovery(false)}
              style={{ marginTop: 10 }}
            >
              Zurück zum Login
            </button>
            </>
          ):(
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Anmelden</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                  Campus-Portal Administration
                </div>
              </div>

              {/* ── ARI: Formularfelder (unverändert) ── */}
              <label className="login-label">Benutzername</label>
              <input
                className="login-input"
                type="text"
                placeholder="admin"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                onKeyDown={handleKey}
                autoComplete="username"
                disabled={loading}
              />

              <label className="login-label">Passwort</label>
              <input
                className="login-input"
                type="password"
                placeholder="••••••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onKeyDown={handleKey}
                autoComplete="current-password"
                disabled={loading}
              />

              {/* [MERGE: Claude] opacity wenn loading – Rest unverändert (Ari) */}
              <button
                className="btn-primary"
                onClick={handleLogin}
                disabled={loading}
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Wird geprüft…" : "Anmelden"}
              </button>

              <button
                className="btn-secondary"
                onClick={() => setShowRecovery(true)}
                disabled={loading}
                style={{ marginTop: 10 }}
                >
                  Passwort vergessen
                </button>

              {error && <div className="login-error">{error}</div>}

              {/* [MERGE: Claude] Hinweis erweitert um Jerome-Endpoint */}
              <div style={{ marginTop: 20, fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
                Auth via Jerome's JWT-Endpoint (POST /login)<br />
                Demo-Fallback: admin / hsmw2025
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
