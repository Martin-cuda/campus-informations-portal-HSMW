// ──────────────────────────────────────────────────────────────────────────
// MensaNotifyForm.jsx  – Ari (Ticket 3)
// Kleines Formular: User trägt E-Mail + Lieblingsgericht ein und bekommt eine
// Bestätigungs-Mail. Nach Klick auf den Confirm-Link in der Mail ist das Abo
// aktiv und der Cron-Scheduler informiert ihn jeden Tag wenn das Gericht da ist.
// Wird auf der Mensa-Seite eingebunden.
// ──────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { subscribeMensaNotify } from "../api/mensaNotify";

export default function MensaNotifyForm() {
  const [email,   setEmail]   = useState("");
  const [keyword, setKeyword] = useState("");
  const [status,  setStatus]  = useState("idle"); // idle | sending | ok | err
  const [msg,     setMsg]     = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setMsg("");
    try {
      const data = await subscribeMensaNotify({
        email: email.trim(),
        keyword: keyword.trim(),
      });
      setStatus("ok");
      setMsg(
        data?.message ||
        "Bestätigungs-Mail wurde versendet. Bitte E-Mail-Postfach prüfen."
      );
      setEmail("");
      setKeyword("");
    } catch (err) {
      setStatus("err");
      if (err.message === "BAD_INPUT") {
        setMsg(err.detail || "Bitte E-Mail und Stichwort prüfen.");
      } else {
        setMsg(err.message || "Es ist etwas schiefgelaufen.");
      }
    }
  }

  return (
    <section className="card fade-up mensa-notify-card" style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
        Mensa-Benachrichtigung
      </h3>
      <p style={{ marginTop: 0, color: "#475569", fontSize: 14 }}>
        Trage dein Lieblingsgericht (z.B. <em>Currywurst</em>) ein und wir schicken
        dir eine E-Mail sobald es auf dem Speiseplan steht. Du kannst dich später
        jederzeit mit einem Klick wieder abmelden.
      </p>

      <form onSubmit={handleSubmit} className="mensa-notify-form">
        <input
          type="email"
          className="login-input"
          placeholder="deine.mail@beispiel.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          type="text"
          className="login-input"
          placeholder='Stichwort z.B. "Currywurst"'
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          required
          minLength={2}
          maxLength={80}
        />
        <button
          type="submit"
          className="btn-secondary"
          disabled={status === "sending"}
          style={{ alignSelf: "flex-start" }}
        >
          {status === "sending" ? "Wird gesendet…" : "Benachrichtigen"}
        </button>
      </form>

      {status === "ok" && (
        <div className="notify-msg notify-msg-ok">{msg}</div>
      )}
      {status === "err" && (
        <div className="notify-msg notify-msg-err">{msg}</div>
      )}
    </section>
  );
}
