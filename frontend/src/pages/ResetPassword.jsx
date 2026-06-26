import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// Relativ -> selber Origin: im Dev ueber den Vite-Proxy (/auth -> Backend),
// in Prod ueber den Reverse-Proxy. Kein hartes 127.0.0.1 mehr (sonst kaputt
// beim Hosten oder beim Aufruf von einem anderen Geraet).
const API = "";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleReset = async () => {
    setMsg("");

    if (!token) {
      setMsg("Ungültiger oder fehlender Token.");
      return;
    }

    if (!password || !confirm) {
      setMsg("Bitte alle Felder ausfüllen.");
      return;
    }

    if (password !== confirm) {
      setMsg("Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: token,
          new_password: password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.detail || "Fehler beim Zurücksetzen.");
        return;
      }

      setMsg("Passwort erfolgreich geändert. Weiterleitung...");

      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (err) {
      setMsg("Server nicht erreichbar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap fade-up">
      <div className="card">

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            Passwort zurücksetzen
          </div>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            Neues Passwort vergeben
          </div>
        </div>

        <label className="login-label">Neues Passwort</label>
        <input
          type="password"
          className="login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        <label className="login-label">Passwort bestätigen</label>
        <input
          type="password"
          className="login-input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={loading}
        />

        <button
          className="btn-primary"
          onClick={handleReset}
          disabled={loading}
          style={{ marginTop: 10, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Wird gespeichert..." : "Passwort ändern"}
        </button>

        {msg && (
          <div className="login-error" style={{ marginTop: 10 }}>
            {msg}
          </div>
        )}

      </div>
    </div>
  );
}
