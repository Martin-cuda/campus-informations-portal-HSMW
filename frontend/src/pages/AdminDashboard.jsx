// ──────────────────────────────────────────────────────────────────────────
// AdminDashboard.jsx  – Live-Metriken-Dashboard für Admins.
// Zugang: nur mit JWT in sessionStorage, sonst Redirect zu /admin.
//
// Fokus dieser Überarbeitung: weniger Vanity-Zahlen, mehr Aussage.
//   * Health-Banner ganz oben: gibt es ECHTE Probleme (5xx) – ja/nein?
//   * Kennzahl-Karten (Visits, Ø ms, Unique IPs) + Serverfehler getrennt von 404
//   * Status-Verteilung der letzten 24h (2xx/3xx/4xx/404/5xx)
//   * Visits/Stunde (SVG), Top-Endpoints, letzte Requests mit korrekt
//     eingefärbten Status-Pills (404 = neutral, NICHT rot wie ein 5xx-Fehler).
//
// Auto-Refresh alle 30s, manuell per Button.
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchMetricsSummary,
  fetchMetricsByHour,
  fetchMetricsTopEndpoints,
  fetchMetricsErrors,
  fetchMetricsRecent,
  resetMetrics,
  hasToken,
  logoutAdmin,
} from "../api/admin";

const REFRESH_MS = 30_000;

// REST-Semantik der Statuscodes an EINER Stelle: Bedeutung + Farbe.
// 404 bekommt bewusst eine neutrale Farbe – es ist kein Serverausfall.
function statusClass(code) {
  if (code >= 500) return { key: "5xx", label: "Serverfehler",  color: "#ef4444" };
  if (code === 404) return { key: "404", label: "Nicht gefunden", color: "#94a3b8" };
  if (code >= 400) return { key: "4xx", label: "Client-Fehler", color: "#f59e0b" };
  if (code >= 300) return { key: "3xx", label: "Weiterleitung", color: "#3b82f6" };
  return { key: "2xx", label: "OK", color: "#22c55e" };
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasToken()) navigate("/admin", { replace: true });
  }, [navigate]);

  const [summary,    setSummary]    = useState(null);
  const [byHour,     setByHour]     = useState(null);
  const [topEp,      setTopEp]      = useState(null);
  const [errors,     setErrors]     = useState(null);
  const [recent,     setRecent]     = useState(null);
  const [status,     setStatus]     = useState("loading"); // loading | ok | error | auth
  const [errMsg,     setErrMsg]     = useState("");
  const [lastLoad,   setLastLoad]   = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [flash,      setFlash]      = useState(null);

  const timerRef = useRef(null);

  async function reload(manual = false) {
    if (manual) setRefreshing(true);
    try {
      const [s, h, t, e, r] = await Promise.all([
        fetchMetricsSummary(),
        fetchMetricsByHour(),
        fetchMetricsTopEndpoints(),
        fetchMetricsErrors(),
        fetchMetricsRecent(),
      ]);
      setSummary(s); setByHour(h); setTopEp(t); setErrors(e); setRecent(r);
      setStatus("ok");
      setLastLoad(new Date());
      if (manual) setFlash({ type: "ok", text: "Aktualisiert" });
    } catch (err) {
      if (err.message === "AUTH") {
        setStatus("auth");
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

  async function handleReset() {
    if (!window.confirm("Alle Besuchsstatistiken wirklich auf 0 setzen? Das kann nicht rückgängig gemacht werden.")) return;
    try {
      const res = await resetMetrics();
      await reload();
      setFlash({ type: "ok", text: `Zurückgesetzt – ${res.deleted} Einträge gelöscht` });
    } catch (err) {
      if (err.message === "AUTH") { navigate("/admin", { replace: true }); return; }
      setFlash({ type: "err", text: "Zurücksetzen fehlgeschlagen" });
    }
  }

  const fmt = (n) => (typeof n === "number" ? n.toLocaleString("de-DE") : "—");

  return (
    <div>
      {/* Header */}
      <div
        className="page-header fade-up"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <div className="page-title">Admin Dashboard</div>
          <div className="page-subtitle">
            Live-Metriken · letzte Aktualisierung: {lastLoad ? lastLoad.toLocaleTimeString("de-DE") : "–"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {flash && (
            <span style={{ fontSize: 13, fontWeight: 600, color: flash.type === "ok" ? "#16a34a" : "#dc2626" }}>
              {flash.type === "ok" ? "✓ " : "✗ "}{flash.text}
            </span>
          )}
          <button className="btn-secondary" onClick={handleReset} style={{ color: "#ef4444", borderColor: "#ef4444" }} title="Alle Visit-Logs löschen (Statistik auf 0)">
            Visits zurücksetzen
          </button>
          <button className="btn-secondary" onClick={() => reload(true)} disabled={refreshing}>
            {refreshing ? "Aktualisiere…" : "Aktualisieren"}
          </button>
          <button className="btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* Loading / Fehler */}
      {status === "loading" && (
        <div className="state-box fade-up"><div className="state-box-text">Metriken werden geladen…</div></div>
      )}
      {status === "error" && (
        <div className="state-box fade-up">
          <div className="state-box-text">
            Metriken konnten nicht geladen werden.
            <div style={{ fontSize: 12, color: "var(--text-quaternary)", marginTop: 6 }}>{errMsg}</div>
          </div>
        </div>
      )}

      {/* ── Health-Banner: das Wichtigste zuerst ── */}
      {status === "ok" && errors && <HealthBanner errors={errors} />}

      {/* ── Kennzahl-Karten ── */}
      {status === "ok" && summary && (
        <div className="metric-cards fade-up">
          <MetricCard label="Besucher · 24h"        value={fmt(summary.unique_ips_24h)} color="#3b82f6" hint="eindeutige Besucher (IP)" />
          <MetricCard label="Besucher · letzte 1h"  value={fmt(summary.unique_ips_1h)}  color="#22c55e" />
          <MetricCard label="Anfragen · 24h"        value={fmt(summary.last_24h)} color="#06b6d4" hint="API-Aufrufe gesamt" />
          <MetricCard label="Ø Antwortzeit · 24h"   value={`${fmt(Math.round(summary.avg_ms_24h))} ms`} color="#8b5cf6" />
          {errors && (
            <MetricCard
              label="Serverfehler 5xx · 24h"
              value={fmt(errors.server_error)}
              color={errors.server_error > 0 ? "#ef4444" : "#22c55e"}
              hint={`${errors.server_error_pct}% aller Anfragen`}
            />
          )}
          {errors && (
            <MetricCard
              label="404 · nicht gefunden"
              value={fmt(errors.not_found)}
              color="#94a3b8"
              hint="Kein Fehler – oft Bots/alte Links"
            />
          )}
        </div>
      )}

      {/* ── Status-Verteilung 24h ── */}
      {status === "ok" && errors && errors.total > 0 && (
        <section className="card fade-up" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0, color: "var(--text-primary)" }}>Antwort-Status · letzte 24h</h3>
          <StatusDistribution errors={errors} fmt={fmt} />
        </section>
      )}

      {/* ── Visits pro Stunde ── */}
      {status === "ok" && byHour && (
        <section className="card fade-up" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0, color: "var(--text-primary)" }}>Visits pro Stunde – letzte 24h</h3>
          <HourlyBarChart buckets={byHour.buckets} />
        </section>
      )}

      {/* ── Top-Endpoints ── */}
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
                    <td style={{ textAlign: "right", color: ep.avg_ms > 1000 ? "#ef4444" : "var(--text-primary)", fontWeight: ep.avg_ms > 1000 ? 700 : 400 }}>
                      {fmt(Math.round(ep.avg_ms))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* ── Letzte Requests ── */}
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
                {recent.entries.map((r) => {
                  const sc = statusClass(r.status_code);
                  return (
                    <tr key={r.id}>
                      <td>{new Date(r.ts).toLocaleTimeString("de-DE")}</td>
                      <td><code>{r.method}</code></td>
                      <td><code>{r.path}</code></td>
                      <td>
                        <span className="status-pill" title={sc.label} style={{ background: sc.color + "22", color: sc.color }}>
                          {r.status_code}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>{r.response_time_ms}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      <div style={{ marginTop: 24, fontSize: 12, color: "var(--text-quaternary)" }}>
        Auto-Refresh alle 30s. 404 zählt bewusst nicht als Serverfehler – nur 5xx sind echte Ausfälle.
      </div>
    </div>
  );
}

// ── Kleine Komponenten ──────────────────────────────────────────────────

function HealthBanner({ errors }) {
  const bad = errors.server_error > 0;
  return (
    <div className={"health-banner fade-up " + (bad ? "health-bad" : "health-ok")}>
      <span className="health-dot" />
      <div>
        <div className="health-title">
          {bad
            ? `${errors.server_error} Serverfehler (5xx) in den letzten 24h`
            : "Alles stabil – keine Serverfehler (5xx) in den letzten 24h"}
        </div>
        <div className="health-sub">
          {errors.total.toLocaleString("de-DE")} Anfragen · {errors.not_found} × 404 (nicht gefunden, kein Ausfall)
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, hint }) {
  return (
    <div className="metric-card" style={{ borderLeftColor: color }}>
      <div className="metric-card-label">{label}</div>
      <div className="metric-card-value" style={{ color }}>{value}</div>
      {hint && <div className="metric-card-hint">{hint}</div>}
    </div>
  );
}

function StatusDistribution({ errors, fmt }) {
  const clientOther = Math.max(0, errors.client_error - errors.not_found);
  const segs = [
    { label: "2xx OK",            count: errors.ok,           color: "#22c55e" },
    { label: "3xx Weiterleitung", count: errors.redirect,     color: "#3b82f6" },
    { label: "4xx Client",        count: clientOther,         color: "#f59e0b" },
    { label: "404 Nicht gefunden",count: errors.not_found,    color: "#94a3b8" },
    { label: "5xx Serverfehler",  count: errors.server_error, color: "#ef4444" },
  ];
  const total = errors.total || 1;
  return (
    <div>
      <div className="statusdist-bar">
        {segs.filter((s) => s.count > 0).map((s) => (
          <div
            key={s.label}
            className="statusdist-seg"
            style={{ width: `${((s.count / total) * 100).toFixed(1)}%`, background: s.color }}
            title={`${s.label}: ${s.count}`}
          />
        ))}
      </div>
      <div className="statusdist-legend">
        {segs.map((s) => (
          <div key={s.label} className="statusdist-item">
            <span className="dot" style={{ background: s.color }} />
            {s.label}
            <span className="statusdist-count">{fmt(s.count)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HourlyBarChart({ buckets }) {
  const max = useMemo(() => Math.max(1, ...buckets.map((b) => b.count)), [buckets]);

  const width = 720, height = 220, padX = 28, padY = 24;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const barW = innerW / buckets.length - 4;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label="Visits pro Stunde">
        <line x1={padX} y1={padY} x2={padX} y2={height - padY} stroke="var(--border-color)" strokeWidth="1" />
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="var(--border-color)" strokeWidth="1" />
        {buckets.map((b, i) => {
          const h = (b.count / max) * innerH;
          const x = padX + i * (innerW / buckets.length) + 2;
          const y = height - padY - h;
          const hourLabel = new Date(b.hour).getHours();
          return (
            <g key={b.hour}>
              <rect x={x} y={y} width={barW} height={h} fill="#2596be" rx="2">
                <title>{`${hourLabel}:00 → ${b.count} Visits`}</title>
              </rect>
              {i % 3 === 0 && (
                <text x={x + barW / 2} y={height - padY + 14} fontSize="10" fill="var(--text-tertiary)" textAnchor="middle">
                  {hourLabel}
                </text>
              )}
            </g>
          );
        })}
        <text x={padX - 6} y={padY + 4} fontSize="10" fill="var(--text-tertiary)" textAnchor="end">{max}</text>
      </svg>
    </div>
  );
}
