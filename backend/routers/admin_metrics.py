# ── ARI: Admin-Metrics-Router (Ticket 2 – Live Dashboard) ────────────────
#
# Liefert aggregierte Visit-Daten für das Admin-Dashboard im Frontend.
# Alle Endpoints sind durch `require_admin` geschützt (JWT + Rollen-Check).
#
# Endpoints:
#   GET /api/admin/metrics/summary          → Total / 24h / 1h Visits, avg ms
#   GET /api/admin/metrics/by-hour          → Visits pro Stunde, letzte 24h
#   GET /api/admin/metrics/top-endpoints    → Top 10 meistgenutzte Endpunkte
#   GET /api/admin/metrics/recent           → Letzte N Roh-Einträge (Debug)
#   GET /api/admin/metrics/errors           → Anteil 4xx/5xx letzte 24h
#
# DoD-Mapping:
#   ✓ Aggregierte Daten (24h Aufrufe)  → /summary + /by-hour
#   ✓ Gesicherter Backend-Endpunkt      → Depends(require_admin)
# ──────────────────────────────────────────────────────────────────────────

from datetime import datetime, timedelta
from typing import List, Dict

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from datenbank import get_db
from admin_guard import require_admin
from admin_table import Admin
from models.visit_log import VisitLog


router = APIRouter(
    prefix="/api/admin/metrics",
    tags=["Admin · Metrics"],
)


# ── Helfer ────────────────────────────────────────────────────────────────

def _utc_now() -> datetime:
    """Aktuelle Zeit in UTC. Sammeln wir an einer Stelle, damit Tests stubbbar sind."""
    return datetime.utcnow()


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.get("/summary")
def metrics_summary(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(require_admin),
) -> Dict:
    """
    Kennzahlen-Übersicht für die Karten oben im Dashboard:
      total          – alle jemals geloggten Visits
      last_24h       – Visits in den letzten 24 Stunden
      last_1h        – Visits in der letzten Stunde
      avg_ms_24h     – Durchschnittliche Antwortzeit (ms) letzte 24h
      unique_ips_24h – Distinct Client-IPs in den letzten 24h
    """
    now = _utc_now()
    cutoff_24h = now - timedelta(hours=24)
    cutoff_1h  = now - timedelta(hours=1)

    total = db.query(func.count(VisitLog.id)).scalar() or 0
    last_24h = (
        db.query(func.count(VisitLog.id))
          .filter(VisitLog.ts >= cutoff_24h)
          .scalar()
    ) or 0
    last_1h = (
        db.query(func.count(VisitLog.id))
          .filter(VisitLog.ts >= cutoff_1h)
          .scalar()
    ) or 0
    avg_ms_24h = (
        db.query(func.avg(VisitLog.response_time_ms))
          .filter(VisitLog.ts >= cutoff_24h)
          .scalar()
    ) or 0
    unique_ips_24h = (
        db.query(func.count(func.distinct(VisitLog.client_ip)))
          .filter(VisitLog.ts >= cutoff_24h)
          .scalar()
    ) or 0

    return {
        "total":          int(total),
        "last_24h":       int(last_24h),
        "last_1h":        int(last_1h),
        "avg_ms_24h":     round(float(avg_ms_24h), 1),
        "unique_ips_24h": int(unique_ips_24h),
        "generated_at":   now.isoformat() + "Z",
    }


@router.get("/by-hour")
def metrics_by_hour(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(require_admin),
) -> Dict:
    """
    Visits pro Stunde der letzten 24 Stunden.
    Antwort:
      buckets: [{ hour: "2026-05-28T14:00:00Z", count: 42 }, ...]   (24 Einträge)

    ── ARI: Wir bauen die 24 Buckets im Python, damit fehlende Stunden mit
    count=0 auftauchen (sonst zeigt das Diagramm Lücken).
    """
    now = _utc_now()
    cutoff = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=23)

    # Pro Stunde: count() gruppiert nach date_trunc-Äquivalent.
    # Für Portabilität (sqlite-Tests vs Postgres-Prod) gruppieren wir im Python.
    rows = (
        db.query(VisitLog.ts)
          .filter(VisitLog.ts >= cutoff)
          .all()
    )

    counts: Dict[str, int] = {}
    for (ts,) in rows:
        key = ts.replace(minute=0, second=0, microsecond=0).isoformat() + "Z"
        counts[key] = counts.get(key, 0) + 1

    buckets: List[Dict] = []
    for i in range(24):
        hour = (cutoff + timedelta(hours=i)).isoformat() + "Z"
        buckets.append({"hour": hour, "count": counts.get(hour, 0)})

    return {"buckets": buckets, "generated_at": now.isoformat() + "Z"}


@router.get("/top-endpoints")
def metrics_top_endpoints(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _admin: Admin = Depends(require_admin),
) -> Dict:
    """
    Top-N Endpoints nach Visits in den letzten 24h, inkl. avg. Latenz.
    Nützlich um die "1000-Kontakte-Bottleneck"-Endpoints zu spotten.
    """
    now = _utc_now()
    cutoff = now - timedelta(hours=24)

    rows = (
        db.query(
            VisitLog.path,
            func.count(VisitLog.id).label("count"),
            func.avg(VisitLog.response_time_ms).label("avg_ms"),
        )
        .filter(VisitLog.ts >= cutoff)
        .group_by(VisitLog.path)
        .order_by(func.count(VisitLog.id).desc())
        .limit(limit)
        .all()
    )

    return {
        "endpoints": [
            {
                "path":   row.path,
                "count":  int(row.count),
                "avg_ms": round(float(row.avg_ms or 0), 1),
            }
            for row in rows
        ],
        "generated_at": now.isoformat() + "Z",
    }


@router.get("/recent")
def metrics_recent(
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    _admin: Admin = Depends(require_admin),
) -> Dict:
    """Letzte N Roh-Einträge – primär für Debugging im Dashboard."""
    rows = (
        db.query(VisitLog)
          .order_by(VisitLog.id.desc())
          .limit(limit)
          .all()
    )
    return {
        "entries": [
            {
                "id":               r.id,
                "path":             r.path,
                "method":           r.method,
                "status_code":      r.status_code,
                "response_time_ms": r.response_time_ms,
                "client_ip":        r.client_ip,
                "ts":               r.ts.isoformat() + "Z",
            }
            for r in rows
        ]
    }


@router.get("/errors")
def metrics_errors(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(require_admin),
) -> Dict:
    """Anteil Fehler-Responses (>=400) der letzten 24h."""
    now = _utc_now()
    cutoff = now - timedelta(hours=24)

    total = (
        db.query(func.count(VisitLog.id))
          .filter(VisitLog.ts >= cutoff)
          .scalar()
    ) or 0
    errors = (
        db.query(func.count(VisitLog.id))
          .filter(VisitLog.ts >= cutoff)
          .filter(VisitLog.status_code >= 400)
          .scalar()
    ) or 0
    server_errors = (
        db.query(func.count(VisitLog.id))
          .filter(VisitLog.ts >= cutoff)
          .filter(VisitLog.status_code >= 500)
          .scalar()
    ) or 0

    pct = (errors / total * 100.0) if total else 0.0

    return {
        "total":         int(total),
        "errors":        int(errors),
        "server_errors": int(server_errors),
        "error_pct":     round(pct, 2),
        "generated_at":  now.isoformat() + "Z",
    }
