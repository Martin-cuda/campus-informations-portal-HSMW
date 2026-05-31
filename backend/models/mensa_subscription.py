# ── ARI: MensaSubscription-Tabelle (Ticket 3 – Lieblingsgericht-Mail) ────
#
# Speichert E-Mail + Keyword (z.B. "Currywurst") pro User. Der tägliche
# Scheduler (services/mensa_scheduler.py) zieht morgens den Speiseplan und
# verschickt eine Mail an alle aktiven Abos deren Keyword im heutigen
# Speiseplan auftaucht.
#
# Spalten:
#   id        – Primärschlüssel
#   email     – Empfänger-Adresse (unique → ein Abo pro Mail).
#   keyword   – Lieblingsgericht-Stichwort, case-insensitive verglichen
#               (siehe scheduler). Maximal 80 Zeichen.
#   active    – Soft-Toggle, damit man ohne DELETE pausieren kann.
#   confirmed – Doppel-Opt-In Flag. Erst nach Klick auf den Bestätigungs-Link
#               in der "willkommen"-Mail wird das auf True gesetzt.
#               Nicht-bestätigte Abos werden vom Scheduler ignoriert.
#   token     – Random-Token für Confirm/Unsubscribe-Links. Wird einmalig
#               beim Erstellen generiert (uuid4 hex).
#   created_at – Wann das Abo angelegt wurde (für Sortierung im Admin).
#   last_sent_date – Letztes Datum (YYYY-MM-DD) an dem für dieses Abo eine
#                    Mail rausging. Verhindert dass der Scheduler bei einem
#                    erneuten Lauf am gleichen Tag doppelt sendet.
# ──────────────────────────────────────────────────────────────────────────

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Index
from datetime import datetime
from datenbank import Base


class MensaSubscription(Base):
    __tablename__ = "mensa_subscriptions"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String(255), nullable=False, unique=True, index=True)
    keyword         = Column(String(80),  nullable=False)
    active          = Column(Boolean,     nullable=False, default=True)
    confirmed       = Column(Boolean,     nullable=False, default=False)
    token           = Column(String(64),  nullable=False, unique=True, index=True)
    created_at      = Column(DateTime,    nullable=False, default=datetime.utcnow)
    last_sent_date  = Column(String(10),  nullable=True)   # "YYYY-MM-DD"

    __table_args__ = (
        # ── ARI: Composite Index für die Scheduler-Hauptquery
        # (aktive + bestätigte Abos heraussuchen).
        Index("ix_mensa_active_confirmed", "active", "confirmed"),
    )

    def __repr__(self) -> str:
        state = "active" if (self.active and self.confirmed) else "pending/off"
        return f"<MensaSubscription {self.email} '{self.keyword}' [{state}]>"
