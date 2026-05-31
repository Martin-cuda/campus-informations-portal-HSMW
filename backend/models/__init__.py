# ── ARI: Models-Paket ─────────────────────────────────────────────────────
# Sammelt alle SQLAlchemy-Modelle die ausserhalb von admin_table.py liegen.
# Wichtig: Damit Base.metadata.create_all() die neuen Tabellen auch anlegt,
# müssen die Klassen hier (oder im jeweiligen Modul) importiert werden bevor
# startup() in main.py läuft.
#
# Konvention: Eine Tabelle pro Datei (visit_log, mensa_subscription, …)
# und alle erben von datenbank.Base, damit sie auf die selbe Postgres-Instanz
# (Neon) landen die Jerome eingerichtet hat.
from .visit_log import VisitLog                # Ticket 2 – Admin Dashboard
from .mensa_subscription import MensaSubscription  # Ticket 3 – Mensa-Notification

__all__ = ["VisitLog", "MensaSubscription"]
