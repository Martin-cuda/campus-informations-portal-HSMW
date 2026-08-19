"""
bereinigung_raeume.py
=====================
Bereinigt die Datenbank: entfernt alle Räume die keine Unterrichtsräume sind
(AZ, unbekannt, Keller ohne Kürzel usw.) und löscht leere Häuser komplett.

Behalten werden nur: HS, SR, PR, CP (Hörsäle, Seminarräume, Praktikumsräume, Computerpools)
"""

import sys
import os

# Damit datenbank.py und die Modelle gefunden werden
sys.path.insert(0, os.path.dirname(__file__))

from datenbank import SessionLocal
from routers.haeuser import HausDB, RaumDB

# ── Liste aller zu behaltenden Räume pro Haus ────────────────────────────
BEHALTEN = {
    "haus1":  ["1-019C", "1-204A", "1-226C", "1-229D", "1-328D", "1-132D"],
    "haus2":  ["2-002", "2-102", "2-202", "2-205", "2-103", "2-203", "2-104",
               "2-303", "2-004", "2-301", "2-K02", "2-005"],
    "haus3":  ["3-002", "3-003", "3-005", "3-006", "3-007", "3-019", "3-102",
               "3-104", "3-106", "3-107", "3-108", "3-008"],
    "haus4":  ["4-021", "4-053"],
    "haus5":  ["5-011A", "5-025B", "5-027B", "5-028B", "5-029B", "5-030B",
               "5-031B", "5-032B", "5-033B", "5-103A", "5-104A", "5-105A",
               "5-106A", "5-109A", "5-119", "5-120", "5-124B", "5-125B",
               "5-126B", "5-127B", "5-128B", "5-129B", "5-130B", "5-206A",
               "5-207A", "5-209A", "5-210A", "5-214A", "5-215A", "5-216A",
               "5-228B", "5-229B", "5-231B", "5-233B", "5-234B", "5-235B",
               "5-236B", "5-237B", "5-238B", "5-239B", "5-303A", "5-304A",
               "5-308A", "5-309A", "5-312A", "5-314A", "5-315A", "5-317A",
               "5-005A", "5-111A"],
    "haus6":  ["6-152", "6-032", "6-202", "6-216", "6-220", "6-226", "6-230",
               "6-236", "6-242", "6-024", "6-101", "6-301", "6-302", "6-401",
               "6-001", "6-016", "6-042", "6-427", "6-431", "6-001a", "6-039"],
    "haus8":  ["8-002", "8-003", "8-102", "8-103", "8-202", "8-203", "8-204",
               "8-302", "8-304", "8-306", "8-005"],
    "haus9":  ["9-002", "9-004", "9-105", "9-106", "9-203", "9-204", "9-102",
               "9-K02"],
    "haus10": ["10-001", "10-002", "10-201", "10-301", "10-K02"],
    "haus11": ["11-002/1", "11-020", "11-101", "11-111", "11-115", "11-117",
               "11-119", "11-206", "11-207", "11-210", "11-205", "11-302",
               "11-303", "11-310", "11-313", "11-315"],
    "haus14": ["14-025"],
    "haus22": ["22-027", "22-102", "22-203", "22-201", "22-202"],
    "haus23": ["A1-003", "A1-002", "A2-001", "A1-001"],
    "haus24": ["24-101", "24-102"],
    "haus29": ["29-007C", "29-008C", "29-010C", "29-009C", "29-006C",
               "29-011C", "29-012C"],
    "haus30": ["30-007", "30-011"],
    "haus39": ["39-001", "39-004", "39-005", "39-009", "39-010", "39-011",
               "39-017", "39-018", "39-019", "39-020", "39-021", "39-022",
               "39-023", "39-024", "39-024a", "39-027", "39-028", "39-029",
               "39-037", "39-039", "39-041", "39-101", "39-111", "39-114",
               "39-115", "39-116", "39-123", "39-132", "39-133", "39-134",
               "39-135", "39-136", "39-137", "39-201", "39-232", "39-233",
               "39-234", "39-235", "39-236", "39-237", "39-301", "39-306b",
               "39-306c", "39-319", "39-320", "39-331", "39-336", "39-337",
               "39-338", "39-339", "39-340", "39-341", "39-025", "39-026"],
    "haus40": ["40-002", "40-009", "40-010", "40-101", "40-008", "40-109",
               "40-110", "40-111"],
    "haus42": ["42-022", "42-020", "42-238", "42-014", "42-023", "42-010",
               "42-126", "42-234", "42-012", "42-235", "42-133", "42-021",
               "42-019", "42-028", "42-004", "42-005", "42-124", "42-016",
               "42-018", "42-013", "42-231", "42-230", "42-236", "42-026",
               "42-127", "42-125", "42-123"],
    "haus48": ["48-001"],
}

# Häuser die komplett entfernt werden
HAEUSER_ENTFERNEN = ["haus17", "haus18", "haus19", "haus20", "haus26",
                     "haus32", "haus45", "haus47"]


def bereinigen():
    db = SessionLocal()
    try:
        raeume_geloescht = 0
        haeuser_geloescht = 0

        # ── 1) Räume in Häusern mit Behalten-Liste bereinigen ────────────
        for haus_id, behalten_ids in BEHALTEN.items():
            # Alle Räume des Hauses holen
            alle_raeume = db.query(RaumDB).filter(
                RaumDB.haus_id == haus_id
            ).all()

            for raum in alle_raeume:
                if raum.id not in behalten_ids:
                    db.delete(raum)
                    raeume_geloescht += 1
                    print(f"  ❌ Raum gelöscht: {raum.id} ({haus_id})")

        db.commit()
        print(f"\n✅ {raeume_geloescht} Räume aus Unterrichts-Häusern entfernt")

        # ── 2) Komplette Häuser entfernen ────────────────────────────────
        for haus_id in HAEUSER_ENTFERNEN:
            haus = db.query(HausDB).filter(HausDB.id == haus_id).first()
            if haus:
                # Räume werden durch cascade="all, delete-orphan" automatisch gelöscht
                db.delete(haus)
                haeuser_geloescht += 1
                print(f"  ❌ Haus komplett gelöscht: {haus_id}")
            else:
                print(f"  ⚠️  Haus nicht gefunden (bereits entfernt?): {haus_id}")

        db.commit()
        print(f"\n✅ {haeuser_geloescht} Häuser komplett entfernt")

        # ── 3) Ergebnis prüfen ───────────────────────────────────────────
        verbleibende_haeuser = db.query(HausDB).count()
        verbleibende_raeume = db.query(RaumDB).count()
        print(f"\n📊 ERGEBNIS:")
        print(f"   Häuser in DB: {verbleibende_haeuser}")
        print(f"   Räume in DB:  {verbleibende_raeume}")

    except Exception as e:
        db.rollback()
        print(f"\n❌ FEHLER: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("🔧 Starte Datenbankbereinigung...")
    print("   Entferne alle Nicht-Unterrichtsräume\n")

    # Sicherheitsabfrage
    antwort = input("Bist du sicher? Diese Aktion löscht Daten aus der DB! (ja/nein): ")
    if antwort.lower() != "ja":
        print("Abgebrochen.")
        sys.exit(0)

    bereinigen()
    print("\n✅ Bereinigung abgeschlossen!")