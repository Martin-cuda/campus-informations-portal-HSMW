# ──────────────────────────────────────────────────────────────────────────
# init_haeuser.py
# Einmaliges Script um alle HSMW-Gebäude und Räume in die Datenbank einzutragen.
# Ausführen mit: python3 init_haeuser.py
# ──────────────────────────────────────────────────────────────────────────

import httpx
# httpx für HTTP-Requests an die eigene API

# Alle aktiven HSMW-Gebäude mit Räumen
# Haus 1 hat bereits echte Räume, alle anderen haben Platzhalter
HAEUSER = [
  { "id": "haus1", "name": "Haus 1", "raeume": [
    { "id": "1-019C", "name": "Raum 1-019C", "etage": "EG" },
    { "id": "1-021C", "name": "Raum 1-021C", "etage": "EG" },
    { "id": "1-022D", "name": "Raum 1-022D", "etage": "EG" },
    { "id": "1-025D", "name": "Raum 1-025D", "etage": "EG" },
    { "id": "1-121B", "name": "Raum 1-121B", "etage": "1. OG" },
    { "id": "1-122B", "name": "Raum 1-122B", "etage": "1. OG" },
    { "id": "1-125C", "name": "Raum 1-125C", "etage": "1. OG" },
    { "id": "1-127C", "name": "Raum 1-127C", "etage": "1. OG" },
    { "id": "1-128C", "name": "Raum 1-128C", "etage": "1. OG" },
    { "id": "1-204A", "name": "Raum 1-204A", "etage": "2. OG" },
    { "id": "1-223B", "name": "Raum 1-223B", "etage": "2. OG" },
    { "id": "1-224B", "name": "Raum 1-224B", "etage": "2. OG" },
    { "id": "1-226C", "name": "Raum 1-226C", "etage": "2. OG" },
    { "id": "1-228C", "name": "Raum 1-228C", "etage": "2. OG" },
    { "id": "1-229D", "name": "Raum 1-229D", "etage": "2. OG" },
    { "id": "1-232D", "name": "Raum 1-232D", "etage": "2. OG" },
    { "id": "1-309A", "name": "Raum 1-309A", "etage": "3. OG" },
    { "id": "1-310A", "name": "Raum 1-310A", "etage": "3. OG" },
    { "id": "1-328D", "name": "Raum 1-328D", "etage": "3. OG" },
    { "id": "1-411D", "name": "Raum 1-411D", "etage": "4. OG" },
    { "id": "1-111A", "name": "Raum 1-111A", "etage": "1. OG" },
    { "id": "1-139C", "name": "Raum 1-139C", "etage": "1. OG" },
    { "id": "1-126C", "name": "Raum 1-126C", "etage": "1. OG" },
    { "id": "1-110A", "name": "Raum 1-110A", "etage": "1. OG" },
    { "id": "1-015B", "name": "Raum 1-015B", "etage": "EG" },
    { "id": "1-402A", "name": "Raum 1-402A", "etage": "4. OG" },
    { "id": "1-132D", "name": "Raum 1-132D", "etage": "1. OG" },
    { "id": "1-403A", "name": "Raum 1-403A", "etage": "4. OG" },
    { "id": "1-307A", "name": "Raum 1-307A", "etage": "3. OG" },
    { "id": "1-104A", "name": "Raum 1-104A", "etage": "1. OG" },
    { "id": "1-004A", "name": "Raum 1-004A", "etage": "EG" },
    { "id": "1-210A", "name": "Raum 1-210A", "etage": "2. OG" },
    { "id": "1-109A", "name": "Raum 1-109A", "etage": "1. OG" },
    { "id": "1-308A", "name": "Raum 1-308A", "etage": "3. OG" },
    { "id": "1-K028", "name": "Raum 1-K028", "etage": "KG" },
    { "id": "1-207A", "name": "Raum 1-207A", "etage": "2. OG" },
    { "id": "1-304A", "name": "Raum 1-304A", "etage": "3. OG" },
    { "id": "1-137C", "name": "Raum 1-137C", "etage": "1. OG" },
    { "id": "1-K025", "name": "Raum 1-K025", "etage": "KG" },
    { "id": "1-107A", "name": "Raum 1-107A", "etage": "1. OG" },
    { "id": "1-K011", "name": "Raum 1-K011", "etage": "KG" },
    { "id": "1-305A", "name": "Raum 1-305A", "etage": "3. OG" },
    { "id": "1-410D", "name": "Raum 1-410D", "etage": "4. OG" },
    { "id": "1-018C", "name": "Raum 1-018C", "etage": "EG" },
    { "id": "1-311A", "name": "Raum 1-311A", "etage": "3. OG" },
    { "id": "1-407A", "name": "Raum 1-407A", "etage": "4. OG" },
    { "id": "1-108A", "name": "Raum 1-108A", "etage": "1. OG" },
    { "id": "1-028A", "name": "Raum 1-028A", "etage": "EG" },
    { "id": "1-017C", "name": "Raum 1-017C", "etage": "EG" },
    { "id": "1-140C", "name": "Raum 1-140C", "etage": "1. OG" },
    { "id": "1-K024", "name": "Raum 1-K024", "etage": "KG" },
    { "id": "1-206A", "name": "Raum 1-206A", "etage": "2. OG" },
    { "id": "1-205A", "name": "Raum 1-205A", "etage": "2. OG" },
    { "id": "1-222B", "name": "Raum 1-222B", "etage": "2. OG" },
    { "id": "1-211A", "name": "Raum 1-211A", "etage": "2. OG" },
    { "id": "1-005A", "name": "Raum 1-005A", "etage": "EG" },
    { "id": "1-029A", "name": "Raum 1-029A", "etage": "EG" },
    { "id": "1-208A", "name": "Raum 1-208A", "etage": "2. OG" },
    { "id": "1-212A", "name": "Raum 1-212A", "etage": "2. OG" },
    { "id": "1-225C", "name": "Raum 1-225C", "etage": "2. OG" },
    { "id": "1-312A", "name": "Raum 1-312A", "etage": "3. OG" },
    { "id": "1-138C", "name": "Raum 1-138C", "etage": "1. OG" },
    { "id": "1-106A", "name": "Raum 1-106A", "etage": "1. OG" },
    { "id": "1-129C", "name": "Raum 1-129C", "etage": "1. OG" },
    { "id": "1-306A", "name": "Raum 1-306A", "etage": "3. OG" },
  ]},
  { "id": "haus2",  "name": "Haus 2",  "raeume": [] },
  { "id": "haus3",  "name": "Haus 3",  "raeume": [] },
  { "id": "haus4",  "name": "Haus 4",  "raeume": [] },
  { "id": "haus5",  "name": "Haus 5",  "raeume": [] },
  { "id": "haus6",  "name": "Haus 6",  "raeume": [] },
  { "id": "haus7",  "name": "Haus 7",  "raeume": [] },
  { "id": "haus8",  "name": "Haus 8",  "raeume": [] },
  { "id": "haus9",  "name": "Haus 9",  "raeume": [] },
  { "id": "haus10", "name": "Haus 10", "raeume": [] },
  { "id": "haus11", "name": "Haus 11", "raeume": [] },
  { "id": "haus14", "name": "Haus 14", "raeume": [] },
  { "id": "haus16", "name": "Haus 16", "raeume": [] },
  { "id": "haus17", "name": "Haus 17", "raeume": [] },
  { "id": "haus18", "name": "Haus 18", "raeume": [] },
  { "id": "haus19", "name": "Haus 19", "raeume": [] },
  { "id": "haus20", "name": "Haus 20", "raeume": [] },
  { "id": "haus26", "name": "Haus 26", "raeume": [] },
  { "id": "haus29", "name": "Haus 29", "raeume": [] },
  { "id": "haus30", "name": "Haus 30", "raeume": [] },
  { "id": "haus32", "name": "Haus 32", "raeume": [] },
  { "id": "haus39", "name": "Haus 39", "raeume": [] },
  { "id": "haus40", "name": "Haus 40", "raeume": [] },
  { "id": "haus42", "name": "Haus 42", "raeume": [] },
  { "id": "haus45", "name": "Haus 45", "raeume": [] },
  { "id": "haus47", "name": "Haus 47", "raeume": [] },
  { "id": "haus48", "name": "Haus 48", "raeume": [] },
]

def main():
    # Backend muss laufen damit das Script funktioniert
    print("Trage Häuser und Räume in die Datenbank ein...")
    response = httpx.post(
        "http://localhost:8000/api/haeuser/bulk",
        json=HAEUSER,
        timeout=30.0
    )
    print(f"Status: {response.status_code}")
    print(response.json())

if __name__ == "__main__":
    main()