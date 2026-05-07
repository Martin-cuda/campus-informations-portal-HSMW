# ── JEROME (ORIGINAL) ────────────────────────────────────────────────────
# Module der App – wird für die Rechte-Verwaltung der Admins genutzt.
# Die IDs entsprechen den Modul-IDs aus backend/data/modules.json (Ari).
# ─────────────────────────────────────────────────────────────────────────
#
# [MERGE: Claude] MODULE-Liste gefüllt mit den tatsächlichen Modul-IDs aus
# Ari's modules.json. Jerome's Original hatte eine leere Liste, was dazu
# führt dass generate_default_permission() immer ein leeres Dict erzeugt
# und neue Admins keinerlei Berechtigungen bekommen würden.
# Basis-Module (mensa, news) sind fest eingebaut und brauchen keine extra
# Berechtigung, deshalb nur die hinzufügbaren Module hier.
#
MODULE = [
    "stundenplan",
    "raumplan",
    "events",
    "bibliothek",
    "kontakt",
    "pruefungen",
    "raumfinder",  # Fabian's neues Modul
]

# für Rechte der Admins für Bearbeitung der Module
def generate_default_permission():
    # alle Module erst mit False deklarieren
    return {modul: False for modul in MODULE}
