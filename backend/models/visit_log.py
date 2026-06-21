# ── ARI: VisitLog-Tabelle (Ticket 2 – Admin Dashboard) ────────────────────
#
# Logged jeden eingehenden API-Request für das Admin-Dashboard.
# Wird von backend/middleware/visit_logger.py asynchron beschrieben damit
# kein Request darauf warten muss bis das INSERT durch ist.
#
# Spalten:
#   id              – Primärschlüssel
#   path            – Request-Pfad (z.B. "/api/mensa/")  → indexiert für GROUP BY
#   method          – HTTP-Methode (GET/POST/…)
#   status_code     – HTTP-Antwort-Code
#   response_time_ms – Wie lange der Request gebraucht hat (für avg-Anzeige)
#   client_ip       – Erste IP aus X-Forwarded-For oder direkter Peer
#                     (NICHT als PII gemeint – nur grobe Unique-Visitor-Heuristik)
#   user_agent      – User-Agent Header (gekürzt 200 chars)
#   ts              – Zeitstempel (UTC) → indexiert für 24h-Fenster-Queries
# ──────────────────────────────────────────────────────────────────────────

from sqlalchemy import Column, Integer, String, DateTime, Index
from datetime import datetime
from datenbank import Base


class VisitLog(Base):
    __tablename__ = "visit_logs"

    id              = Column(Integer, primary_key=True, index=True)
    path            = Column(String(255), nullable=False, index=True)
    method          = Column(String(8), nullable=False, default="GET")
    status_code     = Column(Integer, nullable=False, default=200)
    response_time_ms = Column(Integer, nullable=False, default=0)
    client_ip       = Column(String(64), nullable=True)
    user_agent      = Column(String(200), nullable=True)
    # ── ARI: ts wird als UTC gespeichert, im Frontend wird in lokale Zeit
    # umgerechnet. Index ist kritisch – die "letzte 24h"-Query macht sonst
    # einen Full-Table-Scan, was bei wachsendem Log sub-1-Sekunde sprengen würde.
    ts              = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # ── ARI: Composite Index für die häufigste Query (ts + path).
    # GROUP BY path mit Filter auf ts >= now-24h profitiert davon massiv.
    __table_args__ = (
        Index("ix_visit_logs_ts_path", "ts", "path"),
    )

    def __repr__(self) -> str:
        return f"<VisitLog {self.method} {self.path} -> {self.status_code} @{self.ts}>"
