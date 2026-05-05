import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Placeholder credentials – Jerome ersetzt das durch echte Auth
const ADMIN_USER = "admin";
const ADMIN_PASS = "hsmw2025";

export default function AdminLogin() {
  const [user, setUser]     = useState("");
  const [pass, setPass]     = useState("");
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      setError("");
      setSuccess(true);
      setTimeout(() => navigate("/"), 1200);
    } else {
      setError("Benutzername oder Passwort falsch.");
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">🔐 Admin Login</div>
        <div className="page-subtitle">Nur für autorisierte Benutzer</div>
      </div>

      <div className="login-wrap fade-up">
        <div className="card">
          {success ? (
            <div className="state-box">
              <div className="state-box-icon">✅</div>
              <div className="state-box-text" style={{ color: "#16a34a" }}>
                Login erfolgreich – Weiterleitung…
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Anmelden</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                  Campus-Portal Administration
                </div>
              </div>

              <label className="login-label">Benutzername</label>
              <input
                className="login-input"
                type="text"
                placeholder="admin"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                onKeyDown={handleKey}
                autoComplete="username"
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
              />

              <button className="btn-primary" onClick={handleLogin}>
                Anmelden
              </button>

              {error && <div className="login-error">{error}</div>}

              <div style={{ marginTop: 20, fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
                Demo-Credentials: admin / hsmw2025
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
