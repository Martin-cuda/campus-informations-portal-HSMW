// ──────────────────────────────────────────────────────────────────────────
// AdminDashboard.jsx  – Ari (Ticket 2)
// Live-Metriken-Dashboard für Admins.
// Zugang: Nur sichtbar wenn ein JWT in sessionStorage liegt – sonst redirect
// zur /admin Login-Seite.
//
// Anzeige:
//   * 4 Kennzahl-Karten oben (Total / 24h / 1h / avg ms)
//   * Bar-Chart "Visits pro Stunde – letzte 24h" (reines SVG, keine Lib)
//   * Tabelle Top-Endpoints (24h)
//   * Tabelle Letzte Requests (live)
//   * Fehler-Rate (24h)
//
// Auto-Refresh alle 30 Sekunden. Manuell per "Aktualisieren"-Button.
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchMetricsSummary,
  fetchMetricsByHour,
  fetchMetricsTopEndpoints,
  fetchMetricsErrors,
  fetchMetricsRecent,
  hasToken,
  logoutAdmin,
} from "../api/admin";

const REFRESH_MS = 30_000;

export default function AdminDashboard() {
  const navigate = useNavigate();

  // ── Falls kein Token → sofort zur Login-Seite ────────────────────────
  useEffect(() => {
    if (!hasToken()) {
      navigate("/admin", { replace: true });
    }
  }, [navigate]);

  // ── State ────────────────────────────────────────────────────────────
  const [summary,   setSummary]   = useState(null);
  const [byHour,    setByHour]    = useState(null);
  const [topEp,     setTopEp]     = useState(null);
  const [errors,    setErrors]    = useState(null);
  const [recent,    setRecent]    = useState(null);
  const [status,    setStatus]    = useState("loading"); // loading | ok | error | auth
  const [errMsg,    setErrMsg]    = useState("");
  const [lastLoad,  setLastLoad]  = useState(null);
  // ── ARI: Rueckmeldung beim manuellen "Aktualisieren" ─────────────────
  const [refreshing, setRefreshing] = useState(false);
  const [flash,      setFlash]      = useState(null); // { type: "ok"|"err", text }

  const timerRef = useRef(null);

  async function reload(manual = false) {
    if (manual) setRefreshing(true);
    try {
      // ── Ari: parallel laden, das ist die "live"-Komponente ───────────
      const [s, h, t, e, r] = await Promise.all([
        fetchMetricsSummary(),
        fetchMetricsByHour(),
        fetchMetricsTopEndpoints(),
        fetchMetricsErrors(),
        fetchMetricsRecent(),
      ]);
      setSummary(s);
      setByHour(h);
      setTopEp(t);
      setErrors(e);
      setRecent(r);
      setStatus("ok");
      const now = new Date();
      setLastLoad(now);
      if (manual) setFlash({ type: "ok", text: "Aktualisiert" });
    } catch (err) {
      if (err.message === "AUTH") {
        setStatus("auth");
        // Token weg → zur Login-Seite
        navigate("/admin", { replace: true });
      } else {
        setErrMsg(err.message || String(err));
        setStatus("error");
        if (manual) setFlash({ type: "err", text: "Aktualisieren fehlgeschlagen" });
      }
    } finally {
      if (manual) setRefreshing(false);
    }
  }

  // ── ARI: Flash-Meldung nach ein paar Sekunden automatisch ausblenden ─
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  useEffect(() => {
    reload();
    timerRef.current = setInterval(reload, REFRESH_MS);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogout() {
    logoutAdmin();
    navigate("/admin", { replace: true });
  }

  // ── Renderhilfen ─────────────────────────────────────────────────────
  const fmt = (n) => (typeof n === "number" ? n.toLocaleString("de-DE") : "—");

  return (
    <div>
      {/* Header */}
      <div
        className="page-header fade-up"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div className="page-title">Admin Dashboard</div>
          <div className="page-subtitle">
            Live-Metriken · letzte Aktualisierung:{" "}
            {lastLoad ? lastLoad.toLocaleTimeString("de-DE") : "–"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {flash && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: flash.type === "ok" ? "#16a34a" : "#dc2626",
              }}
            >
              {flash.type === "ok" ? "✓ " : "✗ "}{flash.text}
            </span>
          )}
          <button
            className="btn-secondary"
            onClick={() => reload(true)}
            disabled={refreshing}
          >
            {refreshing ? "Aktualisiere…" : "Aktualisieren"}
          </button>
          <button className="btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Fehler / Loading */}
      {status === "loading" && (
        <div className="state-box fade-up">
          <div className="state-box-text">Metriken werden geladen…</div>
        </div>
      )}
      {status === "error" && (
        <div className="state-box fade-up">
          <div className="state-box-text">
            Metriken konnten nicht geladen werden.
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{errMsg}</div>
          </div>
        </div>
      )}

      {/* ── Kennzahl-Karten ──────────────────────────────────────────── */}
      {status === "ok" && summary && (
        <div className="metric-cards fade-up">
          <MetricCard label="Visits gesamt"        value={fmt(summary.total)}        color="#3b82f6" />
          <MetricCard label="Visits · letzte 24h"  value={fmt(summary.last_24h)}     color="#22c55e" />
          <MetricCard label="Visits · letzte 1h"   value={fmt(summary.last_1h)}      color="#f59e0b" />
          <MetricCard label="Ø Antwortzeit (24h)"  value={`${fmt(Math.round(summary.avg_ms_24h))} ms`} color="#8b5cf6" />
          <MetricCard label="Unique IPs · 24h"     value={fmt(summary.unique_ips_24h)} color="#06b6d4" />
          {errors && (
            <MetricCard
              label="Fehlerquote · 24h"
              value={`${errors.error_pct} %`}
              color={errors.error_pct > 5 ? "#ef4444" : "#22c55e"}
            />
          )}
        </div>
      )}

      {/* ── Visits pro Stunde – SVG-Bar-Chart ───────────────────────── */}
      {status === "ok" && byHour && (
        <section className="card fade-up" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0, color: "var(--text-primary)" }}>Visits pro Stunde – letzte 24h</h3>
          <HourlyBarChart buckets={byHour.buckets} />
        </section>
      )}

      {/* ── Top-Endpoints ───────────────────────────────────────────── */}
      {status === "ok" && topEp && (
        <section className="card fade-up" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0, color: "var(--text-primary)" }}>Top-Endpoints (24h)</h3>
          {topEp.endpoints.length === 0 ? (
            <div className="state-box-text">Noch keine Visits in den letzten 24h.</div>
          ) : (
            <table className="metric-table">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th style={{ textAlign: "right" }}>Visits</th>
                  <th style={{ textAlign: "right" }}>Ø ms</th>
                </tr>
              </thead>
              <tbody>
                {topEp.endpoints.map((ep, i) => (
                  <tr key={ep.path + i}>
                    <td><code>{ep.path}</code></td>
                    <td style={{ textAlign: "right" }}>{fmt(ep.count)}</td>
                    <td
                      style={{
                        textAlign: "right",
                        color: ep.avg_ms > 1000 ? "#ef4444" : "var(--text-primary)",
                        fontWeight: ep.avg_ms > 1000 ? 700 : 400,
                      }}
                    >
                      {fmt(Math.round(ep.avg_ms))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* ── Letzte Requests (Tabelle) ───────────────────────────────── */}
      {status === "ok" && recent && (
        <section className="card fade-up" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0, color: "var(--text-primary)" }}>Letzte Requests</h3>
          {recent.entries.length === 0 ? (
            <div className="state-box-text">Noch keine Requests geloggt.</div>
          ) : (
            <table className="metric-table">
              <thead>
                <tr>
                  <th>Zeit</th>
                  <th>Methode</th>
                  <th>Pfad</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>ms</th>
                </tr>
              </thead>
              <tbody>
                {recent.entries.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.ts).toLocaleTimeString("de-DE")}</td>
                    <td><code>{r.method}</code></td>
                    <td><code>{r.path}</code></td>
                    <td>
                      <span
                        className="status-pill"
                        style={{
                          background:
                            r.status_code < 300
                              ? "#dcfce7"
                              : r.status_code < 400
                                ? "#fef9c3"
                                : "#fee2e2",
                          color:
                            r.status_code < 300
                              ? "#166534"
                              : r.status_code < 400
                                ? "#854d0e"
                                : "#991b1b",
                        }}
                      >
                        {r.status_code}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>{r.response_time_ms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <div style={{ marginTop: 24, fontSize: 12, color: "#94a3b8" }}>
        Auto-Refresh alle 30s · Site muss deployed sein, damit echte Live-Daten kommen.
      </div>
    </div>
  );
}

// ── Kleine Komponenten ──────────────────────────────────────────────────

function MetricCard({ label, value, color }) {
  return (
    <div className="metric-card" style={{ borderLeftColor: color }}>
      <div className="metric-card-label">{label}</div>
      <div className="metric-card-value" style={{ color }}>{value}</div>
    </div>
  );
}

function HourlyBarChart({ buckets }) {
  // Maximaler Wert für die Y-Skala (mind. 1 damit kein Div-by-Zero).
  const max = useMemo(() => {
    return Math.max(1, ...buckets.map((b) => b.count));
  }, [buckets]);

  const width  = 720;
  const height = 220;
  const padX   = 28;
  const padY   = 24;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const barW   = innerW / buckets.length - 4;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label="Visits pro Stunde">
        {/* Y-Achse Linie */}
        <line x1={padX} y1={padY} x2={padX} y2={height - padY} stroke="#cbd5e1" strokeWidth="1" />
        {/* X-Achse Linie */}
        <line
          x1={padX}
          y1={height - padY}
          x2={width - padX}
          y2={height - padY}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        {buckets.map((b, i) => {
          const h = (b.count / max) * innerH;
          const x = padX + i * (innerW / buckets.length) + 2;
          const y = height - padY - h;
          const hourLabel = new Date(b.hour).getHours();
          return (
            <g key={b.hour}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                fill="#2596be"
                rx="2"
              >
                <title>{`${hourLabel}:00 → ${b.count} Visits`}</title>
              </rect>
              {i % 3 === 0 && (
                <text
                  x={x + barW / 2}
                  y={height - padY + 14}
                  fontSize="10"
                  fill="#64748b"
                  textAnchor="middle"
                >
                  {hourLabel}
                </text>
              )}
            </g>
          );
        })}
        {/* Y-Max-Label */}
        <text x={padX - 6} y={padY + 4} fontSize="10" fill="#64748b" textAnchor="end">
          {max}
        </text>
      </svg>
    </div>
  );
}
