# Campus Informationsportal HSMW

Das **Campus Informationsportal HSMW** ist eine webbasierte Anwendung zur zentralen Bereitstellung wichtiger Informationen für Studierende der Hochschule Mittweida.

Das Portal bündelt unter anderem:

* aktuelle Hochschul-News
* Mensa-Speiseplan und Mensa-Informationen
* Informationen zu Modulen und Veranstaltungen
* einen Raumfinder zur Suche nach freien Räumen
* Raumbelegungen für eingeloggte Nutzer
* Benutzeranmeldung und Authentifizierung
* einen geschützten Administrationsbereich
* Mensa-Benachrichtigungen per E-Mail
* Dark Mode und responsive Darstellung

---

## 1. Voraussetzungen

Für die lokale Ausführung werden folgende Komponenten benötigt:

### Backend

* Python 3.11 oder neuer
* `pip`
* PostgreSQL-Datenbank bzw. eine kompatible PostgreSQL-Instanz
* Internetzugang für externe Schnittstellen, z. B. Mensa- und News-Daten

### Frontend

* Node.js
* npm

### Optionale Dienste

Je nach verwendeten Funktionen werden zusätzlich Zugangsdaten für externe Dienste benötigt:

* PostgreSQL / Neon für die Datenbank
* SMTP-Zugang für den Versand von E-Mails
* gegebenenfalls Zugangsdaten für externe APIs

---

## 2. Projektstruktur

Das Projekt ist grundsätzlich in Frontend und Backend aufgeteilt:

```text
campus-informations-portal-HSMW/
│
├── backend/
│   ├── main.py
│   ├── datenbank.py
│   ├── auth.py
│   ├── security.py
│   ├── admin_guard.py
│   └── routers/
│       ├── auth.py
│       ├── news.py
│       ├── mensa.py
│       ├── module.py
│       ├── raeume.py
│       └── ...
│
├── frontend/
│   ├── package.json
│   └── src/
│       └── ...
│
├── docs/
│   └── ...
│
├── scripts/
│   └── ...
│
├── requirements.txt
├── README.md
└── ...
```

Das Backend stellt die REST-Schnittstellen zur Verfügung und übernimmt unter anderem Authentifizierung, Datenbankzugriffe und die Verarbeitung der Geschäftslogik.

Das Frontend stellt die Benutzeroberfläche bereit und kommuniziert über die REST-API mit dem Backend.

---

# 3. Repository klonen

Das Projekt kann mit Git geklont werden:

```bash
git clone https://github.com/Martin-cuda/campus-informations-portal-HSMW.git
cd campus-informations-portal-HSMW
```

---

# 4. Backend einrichten

Zunächst sollte eine virtuelle Python-Umgebung erstellt werden.

### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
```

### Linux / macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Anschließend werden die benötigten Python-Abhängigkeiten installiert:

```bash
pip install -r requirements.txt
```

---

# 5. Umgebungsvariablen konfigurieren

Das Backend benötigt Konfigurationswerte für Datenbank, Authentifizierung und gegebenenfalls externe Dienste.

Die benötigten Werte werden über Umgebungsvariablen bereitgestellt.

Typische Konfigurationswerte sind unter anderem:

```text
DATABASE_URL
SECRET_KEY
PUBLIC_BASE_URL
FRONTEND_BASE_URL
```

Für den E-Mail-Versand werden zusätzlich die entsprechenden SMTP-Zugangsdaten benötigt.

### Beispiel einer lokalen Konfiguration

```text
DATABASE_URL=<PostgreSQL-Verbindungsstring>
SECRET_KEY=<geheimer-Schlüssel>
PUBLIC_BASE_URL=http://localhost:8000
FRONTEND_BASE_URL=http://localhost:5173
```

**Wichtig:** Zugangsdaten und geheime Schlüssel dürfen nicht in das Git-Repository eingecheckt werden.

Eine lokale `.env`-Datei sollte daher nicht veröffentlicht werden.

---

# 6. Datenbank

Das Projekt verwendet PostgreSQL zur persistenten Speicherung der benötigten Daten.

Unter anderem werden Daten für folgende Bereiche verwendet:

* Benutzer
* News
* Mensa-Daten
* Räume
* Häuser
* Raumbelegungen
* weitere projektspezifische Daten

Die Datenbankverbindung wird vom Backend über die konfigurierte `DATABASE_URL` hergestellt.

Die Datenbankmodelle und die Verbindung sind insbesondere in folgenden Dateien umgesetzt:

```text
backend/datenbank.py
backend/routers/raeume.py
```

Die Raumbelegungen werden persistent in der Datenbank gespeichert.

---

# 7. Backend starten

Das FastAPI-Backend kann aus dem Projektverzeichnis gestartet werden.

```bash
uvicorn backend.main:app --reload
```

Nach dem Start ist die API standardmäßig unter folgender Adresse erreichbar:

```text
http://localhost:8000
```

FastAPI stellt außerdem eine automatisch generierte API-Dokumentation zur Verfügung:

```text
http://localhost:8000/docs
```

Dort können die vorhandenen REST-Endpunkte eingesehen und getestet werden.

---

# 8. Frontend einrichten

In das Frontend-Verzeichnis wechseln:

```bash
cd frontend
```

Anschließend die JavaScript-Abhängigkeiten installieren:

```bash
npm install
```

Danach kann das Frontend mit dem Entwicklungsserver gestartet werden:

```bash
npm run dev
```

Das Frontend ist anschließend normalerweise unter:

```text
http://localhost:5173
```

erreichbar.

---

# 9. Authentifizierung

Bestimmte Funktionen des Portals sind nur für eingeloggte Nutzer verfügbar.

Dazu gehört insbesondere die Verwaltung von Raumbelegungen.

Das Backend prüft bei geschützten Endpunkten, ob ein gültiger authentifizierter Benutzer vorhanden ist.

Beispielsweise ist das Belegen eines Raumes nur für eingeloggte Nutzer möglich.

Die Authentifizierung wird unter anderem über folgende Komponenten umgesetzt:

```text
backend/auth.py
backend/security.py
```

---

# 10. Wichtige Funktionen

## 10.1 News

Das Portal stellt aktuelle Hochschul-News zur Verfügung.

Die News können über das entsprechende Frontend-Modul aufgerufen werden.

Für administrative Nutzer stehen zusätzliche Funktionen zur Verwaltung der News zur Verfügung.

---

## 10.2 Mensa

Das Mensa-Modul stellt Informationen zum Speiseangebot bereit.

Zusätzlich wurde eine Benachrichtigungsfunktion implementiert, über die Nutzer über entsprechende Mensa-Informationen per E-Mail informiert werden können.

Für den E-Mail-Versand muss ein entsprechender SMTP-Zugang konfiguriert sein.

---

## 10.3 Modulübersicht

Das Modul-System stellt Informationen zu Studienmodulen bereit.

Die Informationen können innerhalb des Portals aufgerufen und strukturiert dargestellt werden.

---

## 10.4 Raumfinder

Der Raumfinder ermöglicht die Suche nach geeigneten beziehungsweise freien Räumen.

Dabei können unter anderem:

* Gebäude ausgewählt werden
* Räume angezeigt werden
* Zeiträume berücksichtigt werden
* Raumbelegungen vorgenommen werden

Die Räume werden für die einzelnen Gebäude bedarfsgerecht geladen, um unnötige Datenübertragungen zu vermeiden.

---

## 10.5 Raumbelegung

Eingeloggte Nutzer können Räume für einen bestimmten Zeitraum belegen.

Vor dem Speichern wird geprüft, ob bereits eine zeitliche Überschneidung mit einer vorhandenen Belegung besteht.

Beispiel:

```text
Bestehende Belegung:
13:00 – 14:30

Neue Belegung:
14:00 – 15:00

→ Belegung wird abgelehnt
```

Eine nicht überlappende Belegung kann dagegen gespeichert werden.

Die Raumbelegungen werden dauerhaft in der Datenbank gespeichert.

Die zugehörige Backend-Logik befindet sich insbesondere in:

```text
backend/routers/raeume.py
```

Wichtige Endpunkte sind unter anderem:

```text
GET    /api/raeume/
POST   /api/raeume/belegen
DELETE /api/raeume/belegen/{belegung_id}
```

---

# 11. REST-API

Das Backend basiert auf FastAPI und stellt REST-Endpunkte für die einzelnen Funktionsbereiche bereit.

Beispielsweise:

```text
/api/auth
/api/news
/api/mensa
/api/module
/api/raeume
```

Die API kann nach dem Start über die automatisch generierte Swagger-Dokumentation untersucht werden:

```text
http://localhost:8000/docs
```

Dort können Endpunkte und deren Eingabeparameter nachvollzogen und teilweise direkt getestet werden.

---

# 12. Administrationsbereich

Das Projekt besitzt einen geschützten Administrationsbereich.

Administrative Funktionen sind durch zusätzliche Berechtigungsprüfungen geschützt.

Unter anderem können administrative Nutzer Funktionen zur Verwaltung von Inhalten und zur Auswertung bestimmter Portal-Daten verwenden.

Die entsprechenden Berechtigungsprüfungen werden unter anderem über:

```text
backend/admin_guard.py
```

umgesetzt.

---

# 13. Dark Mode und responsive Darstellung

Das Frontend unterstützt einen Dark Mode.

Die Darstellung wurde außerdem für unterschiedliche Bildschirmgrößen angepasst, sodass das Portal sowohl auf Desktop-Computern als auch auf mobilen Geräten verwendet werden kann.

---

# 14. Testen der Anwendung

Nach dem Start von Backend und Frontend können die wichtigsten Funktionen manuell überprüft werden.

### Test 1 – Start der Anwendung

1. Backend starten.
2. Frontend starten.
3. Portal im Browser öffnen.
4. Prüfen, ob die Startseite korrekt geladen wird.

### Test 2 – News

1. News-Bereich öffnen.
2. Prüfen, ob News geladen werden.
3. Eine News öffnen.
4. Prüfen, ob die Inhalte korrekt dargestellt werden.

### Test 3 – Mensa

1. Mensa-Bereich öffnen.
2. Prüfen, ob die aktuellen Mensa-Informationen geladen werden.
3. Prüfen, ob die Darstellung der Gerichte funktioniert.

### Test 4 – Login

1. Login-Seite öffnen.
2. Mit gültigen Zugangsdaten anmelden.
3. Prüfen, ob der Login erfolgreich durchgeführt wird.
4. Eine geschützte Funktion aufrufen.

### Test 5 – Raumfinder

1. Raumfinder öffnen.
2. Ein Gebäude auswählen.
3. Räume laden lassen.
4. Einen Zeitraum auswählen.
5. Prüfen, ob freie Räume angezeigt werden.

### Test 6 – Raumbelegung

1. Einloggen.
2. Einen freien Raum auswählen.
3. Zeitraum und erforderliche Angaben eingeben.
4. Raum belegen.
5. Prüfen, ob die Belegung gespeichert wurde.

Anschließend sollte versucht werden, denselben Raum im gleichen Zeitraum erneut zu belegen.

Erwartetes Ergebnis:

```text
Die Überschneidung wird erkannt
und die zweite Belegung wird abgelehnt.
```

### Test 7 – Fehlerbehandlung

Zusätzlich können Fehlerfälle getestet werden, beispielsweise:

* Backend nicht erreichbar
* ungültige Eingaben
* nicht authentifizierter Zugriff auf geschützte Endpunkte
* bereits belegter Raum
* nicht vorhandene Belegung beim Löschen

---

# 15. Fehlerbehandlung

Das Projekt enthält verschiedene Mechanismen zur Behandlung von Fehlerfällen.

Beispielsweise werden beim Raumfinder Fehler beim Laden der Räume im Frontend angezeigt.

Bei einem fehlgeschlagenen Ladevorgang kann der Ladevorgang erneut versucht werden.

Auch serverseitige Fehler werden über entsprechende HTTP-Statuscodes und Fehlermeldungen an das Frontend zurückgegeben.

---

# 16. Erweiterung und Wartung

Durch die Trennung von Frontend, Backend und einzelnen API-Routern können weitere Funktionen modular ergänzt werden.

Neue Backend-Funktionen können beispielsweise als eigener Router umgesetzt werden:

```text
backend/routers/
```

Für neue Datenbankobjekte können entsprechende SQLAlchemy-Modelle ergänzt werden.

Neue Benutzeroberflächen können im Frontend als eigenständige Komponenten beziehungsweise Seiten ergänzt werden.

Bei Änderungen an bestehenden API-Endpunkten sollten sowohl Backend als auch die entsprechenden Frontend-Aufrufe angepasst und anschließend getestet werden.

---

# 17. Bekannte Einschränkungen

Trotz des funktionsfähigen Projektstands bestehen einige Einschränkungen.

Dazu gehören insbesondere:

* Es existieren keine umfangreichen automatisierten End-to-End-Tests.
* Einige externe Datenquellen sind von ihrer jeweiligen Verfügbarkeit abhängig.
* Für bestimmte Funktionen werden externe Dienste beziehungsweise Zugangsdaten benötigt.
* Die Genauigkeit und Aktualität externer Informationen kann nicht vollständig durch das Portal kontrolliert werden.

---

# 18. Entwicklung

Die Entwicklung des Projekts wurde über Git und GitHub versioniert.

Das Repository enthält die Entwicklungs- und Commit-Historie des Projekts:

https://github.com/Martin-cuda/campus-informations-portal-HSMW

Die Commit-Historie dokumentiert unter anderem die Entwicklung des Raumfinders, der Authentifizierung, der Datenbankanbindung, des News- und Mensa-Moduls sowie verschiedener Verbesserungen an Benutzeroberfläche und Performance.

---

# 19. Projekt starten – Kurzfassung

Für einen schnellen lokalen Start:

### Backend

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Linux/macOS:

```bash
source .venv/bin/activate
```

Danach:

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

### Frontend

In einem zweiten Terminal:

```bash
cd frontend
npm install
npm run dev
```

Danach:

```text
Frontend:
http://localhost:5173

Backend:
http://localhost:8000

API-Dokumentation:
http://localhost:8000/docs
```

---

# 20. Repository

**GitHub:**
https://github.com/Martin-cuda/campus-informations-portal-HSMW

Das Repository enthält den vollständigen Quellcode sowie die für die Entwicklung relevanten Projektdateien.

Für die offizielle Abgabe wird zusätzlich eine ZIP-Datei mit dem vollständigen Projektstand bereitgestellt.
