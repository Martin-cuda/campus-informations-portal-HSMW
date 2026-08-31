# Campus Informationsportal HSMW

Das **Campus Informationsportal HSMW** ist eine webbasierte Anwendung zur zentralen Bereitstellung wichtiger Informationen für Studierende der Hochschule Mittweida.

Das Portal bündelt unter anderem:

* aktuelle Hochschul-News
* Mensa-Speisepläne und Mensa-Informationen
* Informationen zu Modulen und Veranstaltungen
* einen Raumfinder zur Suche nach freien Räumen
* Raumbelegungen für eingeloggte Nutzer
* Benutzeranmeldung und Authentifizierung
* einen geschützten Administrationsbereich
* Mensa-Benachrichtigungen per E-Mail
* Dark Mode und responsive Darstellung

---

# 1. Voraussetzungen

Für die lokale Ausführung werden folgende Komponenten benötigt.

## Backend

* Python 3.11 oder neuer
* pip
* Internetzugang

## Frontend

* Node.js
* npm

Das Backend verwendet eine PostgreSQL-Datenbank. Für die bereitgestellte Abgabe wird die konfigurierte Datenbankverbindung verwendet. Eine lokale PostgreSQL-Installation ist daher für die normale Korrektur nicht erforderlich, sofern die bereitgestellte Konfiguration verwendet werden kann.

Für einzelne Funktionen, beispielsweise den E-Mail-Versand, können zusätzliche externe Konfigurationen erforderlich sein.

---

# 2. Projektstruktur

Das Projekt ist in ein Frontend und ein Backend aufgeteilt:

```text
campus-informations-portal-HSMW/
│
├── backend/
│   ├── main.py
│   ├── datenbank.py
│   ├── auth.py
│   ├── security.py
│   ├── admin_guard.py
│   ├── recovery.py
│   ├── models.py
│   ├── services/
│   └── routers/
│       ├── mensa.py
│       ├── modules.py
│       ├── kontakte.py
│       ├── news.py
│       ├── raeume.py
│       ├── haeuser.py
│       ├── login_router.py
│       ├── admin_metrics.py
│       └── mensa_notify.py
│
├── frontend/
│   ├── package.json
│   └── src/
│       └── ...
│
├── scripts/
│   └── ...
│
├── requirements.txt
├── README.md
└── ...
```

Das Backend basiert auf **FastAPI** und stellt die REST-Schnittstellen bereit. Zusätzlich übernimmt es unter anderem Authentifizierung, Datenbankzugriffe und Geschäftslogik.

Das Frontend stellt die Benutzeroberfläche bereit und kommuniziert über die REST-API mit dem Backend.

---

# 3. Repository klonen

Das Projekt kann mit Git geklont werden:

```bash
git clone https://github.com/Martin-cuda/campus-informations-portal-HSMW.git
cd campus-informations-portal-HSMW
```

Alternativ kann das bereitgestellte ZIP-Archiv verwendet und lokal entpackt werden.

---

# 4. Backend einrichten

Für das Backend wird eine virtuelle Python-Umgebung verwendet.

## 4.1 Virtuelle Umgebung erstellen

Der folgende Befehl wird im **Projekt-Hauptverzeichnis** ausgeführt:

```bash
python -m venv .venv
```

## 4.2 Virtuelle Umgebung aktivieren

### Windows – CMD

```cmd
.venv\Scripts\activate
```

### Windows – PowerShell

```powershell
.venv\Scripts\Activate.ps1
```

### Linux / macOS

```bash
source .venv/bin/activate
```

Nach erfolgreicher Aktivierung sollte `(.venv)` am Anfang der Terminalzeile angezeigt werden.

---

# 5. Python-Abhängigkeiten installieren

Nach Aktivierung der virtuellen Umgebung werden die benötigten Python-Pakete installiert:

```bash
pip install -r requirements.txt
```

Die verwendeten Python-Abhängigkeiten sind in der Datei `requirements.txt` festgelegt.

---

# 6. Backend-Konfiguration

Das Backend benötigt Konfigurationswerte für den Datenbankzugriff und weitere Funktionen.

Für die bereitgestellte Abgabe ist die benötigte Konfiguration bereits vorbereitet. Sofern eine `backend/.env` Bestandteil der bereitgestellten ZIP-Abgabe ist, befindet sie sich an folgender Stelle:

```text
backend/.env
```

Die Datei enthält die für den Betrieb des Backends benötigten Umgebungsvariablen, insbesondere die Datenbankverbindung und weitere Backend-Konfigurationen.

Für die normale Korrektur muss daher grundsätzlich keine eigene PostgreSQL-Datenbank eingerichtet werden, sofern die mitgelieferte Konfiguration verwendet werden kann.

> **Wichtig:** Die `.env` enthält sensible Konfigurationsdaten und sollte nicht in einem öffentlichen Repository veröffentlicht werden. Zugangsdaten und geheime Schlüssel dürfen nicht öffentlich weitergegeben werden.

Falls die Anwendung ohne die bereitgestellte Konfiguration eingerichtet wird, müssen die entsprechenden Umgebungsvariablen für die eigene Umgebung angepasst werden.

---

# 7. Datenbank

Das Backend verwendet PostgreSQL als Datenbank.

Die Datenbankverbindung wird über die Backend-Konfiguration bereitgestellt.

Beim Start des Backends werden die im Projekt definierten Datenbanktabellen über die vorhandene SQLAlchemy-Konfiguration initialisiert beziehungsweise angelegt, sofern sie noch nicht vorhanden sind.

Eine manuelle Ausführung eines zusätzlichen Datenbank-Initialisierungsschrittes ist für den normalen Start der bereitgestellten Projektversion daher nicht erforderlich.

Für die vollständige Funktionalität werden die für die Anwendung benötigten Daten, beispielsweise Gebäude, Räume, News und Raumbelegungen, über die verwendete Datenbank bereitgestellt.

---

# 8. Backend starten

## Wichtig

Das Backend muss aus dem **`backend`-Verzeichnis** gestartet werden.

Der korrekte Ablauf lautet:

```bash
cd backend
uvicorn main:app --reload
```

**Nicht** aus dem Projekt-Hauptverzeichnis mit folgendem Befehl starten:

```bash
uvicorn backend.main:app --reload
```

Der Grund dafür ist die Modulstruktur des Backends. `main.py` verwendet beispielsweise Imports der Form:

```python
from routers.mensa import router as mensa_router
from routers.news import router as news_router
from routers.raeume import router as raeume_router
```

Daher muss das `backend`-Verzeichnis beim Start als Arbeitsverzeichnis verwendet werden.

Nach erfolgreichem Start ist das Backend unter folgender Adresse erreichbar:

```text
http://localhost:8000
```

Die automatisch generierte Swagger-Dokumentation der REST-API ist unter folgender Adresse verfügbar:

```text
http://localhost:8000/docs
```

Das Terminal mit dem laufenden Backend muss während der Nutzung des Frontends geöffnet bleiben.

---

# 9. Frontend einrichten

Das Frontend wird in einem **zweiten Terminal-Fenster** gestartet.

Das zweite Terminal sollte im Projekt-Hauptverzeichnis geöffnet werden.

Anschließend:

```bash
cd frontend
```

Die benötigten Node.js-Abhängigkeiten werden installiert mit:

```bash
npm install
```

---

# 10. Frontend starten

Nach der Installation der Abhängigkeiten wird der Entwicklungsserver gestartet:

```bash
npm run dev
```

Das Frontend ist anschließend unter folgender Adresse erreichbar:

```text
http://localhost:5173/
```

---

# 11. Vollständiger Startablauf

Für die lokale Ausführung werden **zwei separate Terminal-Fenster** benötigt.

## Terminal 1 – Backend

Im Projekt-Hauptverzeichnis:

```bash
python -m venv .venv
```

Virtuelle Umgebung aktivieren.

### Windows CMD

```cmd
.venv\Scripts\activate
```

### Windows PowerShell

```powershell
.venv\Scripts\Activate.ps1
```

### Linux / macOS

```bash
source .venv/bin/activate
```

Danach die Python-Abhängigkeiten installieren:

```bash
pip install -r requirements.txt
```

In den Backend-Ordner wechseln:

```bash
cd backend
```

Backend starten:

```bash
uvicorn main:app --reload
```

Das Backend läuft anschließend unter:

```text
http://localhost:8000
```

Swagger ist erreichbar unter:

```text
http://localhost:8000/docs
```

---

## Terminal 2 – Frontend

Das zweite Terminal wird im **Projekt-Hauptverzeichnis** geöffnet.

```bash
cd frontend
```

Abhängigkeiten installieren:

```bash
npm install
```

Frontend starten:

```bash
npm run dev
```

Das Frontend ist anschließend unter:

```text
http://localhost:5173/
```

erreichbar.

---

# 12. Übersicht der wichtigsten Adressen

| Komponente                | Adresse                      |
| ------------------------- | ---------------------------- |
| Frontend                  | `http://localhost:5173/`     |
| Backend                   | `http://localhost:8000`      |
| Swagger API-Dokumentation | `http://localhost:8000/docs` |

---

# 13. Authentifizierung

Bestimmte Funktionen des Portals sind nur für eingeloggte Nutzer verfügbar.

Dazu gehören insbesondere geschützte Funktionen wie die Verwaltung von Raumbelegungen.

Die Authentifizierung und sicherheitsbezogene Funktionen werden unter anderem über folgende Komponenten umgesetzt:

```text
backend/auth.py
backend/security.py
backend/routers/login_router.py
```

---

# 14. Test-Zugangsdaten

Für die Korrektur werden Test-Zugangsdaten mit der Abgabe bereitgestellt.

Die tatsächlichen Benutzerkonten und Passwörter befinden sich in der **separaten Textdatei innerhalb der bereitgestellten ZIP-Datei**.

Dort sind die für die Bewertung vorgesehenen Zugangsdaten angegeben.

Mit dem normalen Benutzerkonto können unter anderem folgende Funktionen getestet werden:

* Anmeldung
* geschützte Funktionen
* Raumfinder
* Raumbelegung
* Verwaltung eigener Belegungen

Mit dem Administratorkonto können zusätzlich die geschützten Funktionen des Administrationsbereichs getestet werden.

> **Hinweis:** Die Test-Zugangsdaten sind ausschließlich für die Bewertung des Projekts vorgesehen und dürfen nicht öffentlich weitergegeben werden.

---

# 15. Wichtige Funktionen

## 15.1 News

Das Portal stellt aktuelle Hochschul-News zur Verfügung.

Die News können über das entsprechende Frontend-Modul aufgerufen werden.

Für administrative Nutzer stehen zusätzliche Funktionen zur Verwaltung von News zur Verfügung.

---

## 15.2 Mensa

Das Mensa-Modul stellt Informationen zum aktuellen Speiseangebot bereit.

Zusätzlich ist eine Benachrichtigungsfunktion vorhanden, über die Nutzer über entsprechende Mensa-Informationen per E-Mail informiert werden können.

Für den E-Mail-Versand müssen die entsprechenden SMTP-Konfigurationswerte verfügbar sein.

---

## 15.3 Module

Das Modul-System stellt Informationen zu Studienmodulen bereit.

Die Informationen können innerhalb des Portals aufgerufen und strukturiert dargestellt werden.

---

## 15.4 Raumfinder

Der Raumfinder ermöglicht die Suche nach geeigneten beziehungsweise freien Räumen.

Dabei können unter anderem:

* Gebäude ausgewählt werden
* Räume angezeigt werden
* Zeiträume berücksichtigt werden
* Raumbelegungen vorgenommen werden

---

## 15.5 Raumbelegung

Eingeloggte Nutzer können Räume für einen bestimmten Zeitraum belegen.

Vor dem Speichern wird geprüft, ob bereits eine zeitliche Überschneidung mit einer vorhandenen Belegung besteht.

Beispiel:

```text
Bestehende Belegung:
13:00 – 14:30

Neue Belegung:
14:00 – 15:00

Ergebnis:
Die neue Belegung wird wegen einer zeitlichen Überschneidung abgelehnt.
```

Eine zeitlich nicht überlappende Belegung kann dagegen gespeichert werden.

Die Raumbelegungen werden persistent in der Datenbank gespeichert.

Die entsprechende Backend-Logik befindet sich insbesondere in:

```text
backend/routers/raeume.py
```

---

# 16. REST-API

Das Backend basiert auf FastAPI und stellt REST-Endpunkte für die einzelnen Funktionsbereiche bereit.

Die API umfasst unter anderem Bereiche für:

```text
/api/auth
/api/news
/api/mensa
/api/module
/api/raeume
```

Die vollständigen verfügbaren Endpunkte können nach dem Start des Backends über die Swagger-Dokumentation eingesehen werden:

```text
http://localhost:8000/docs
```

---

# 17. Administrationsbereich

Das Projekt besitzt einen geschützten Administrationsbereich.

Administrative Funktionen sind durch zusätzliche Berechtigungsprüfungen geschützt.

Die entsprechenden Berechtigungsprüfungen werden unter anderem über folgende Komponente umgesetzt:

```text
backend/admin_guard.py
```

Für die Überprüfung des Administrationsbereichs ist das in der Abgabe bereitgestellte Administratorkonto zu verwenden.

---

# 18. Dark Mode und responsive Darstellung

Das Frontend unterstützt einen Dark Mode.

Die Benutzeroberfläche wurde außerdem für unterschiedliche Bildschirmgrößen angepasst, sodass das Portal sowohl auf Desktop-Computern als auch auf mobilen Geräten verwendet werden kann.

---

# 19. Testen der Anwendung

Nach dem Start von Backend und Frontend können die wichtigsten Funktionen manuell getestet werden.

## Test 1 – Anwendung starten

1. Backend starten.
2. Frontend starten.
3. `http://localhost:5173/` im Browser öffnen.
4. Prüfen, ob die Startseite korrekt geladen wird.

**Erwartetes Ergebnis:**

Die Startseite des Campus Informationsportals wird ohne Fehler geladen.

---

## Test 2 – News

1. News-Bereich öffnen.
2. Prüfen, ob News geladen werden.
3. Eine News öffnen.
4. Prüfen, ob die Inhalte korrekt dargestellt werden.

**Erwartetes Ergebnis:**

Die verfügbaren News werden geladen und korrekt dargestellt.

---

## Test 3 – Mensa

1. Mensa-Bereich öffnen.
2. Prüfen, ob die Mensa-Informationen geladen werden.
3. Prüfen, ob die Gerichte korrekt dargestellt werden.

**Erwartetes Ergebnis:**

Die verfügbaren Mensa-Informationen werden angezeigt.

---

## Test 4 – Login

1. Login-Seite öffnen.
2. Die Zugangsdaten aus der mitgelieferten Zugangsdaten-Datei verwenden.
3. Anmeldung durchführen.
4. Prüfen, ob die Anmeldung erfolgreich durchgeführt wird.
5. Eine geschützte Funktion aufrufen.

**Erwartetes Ergebnis:**

Der Benutzer wird erfolgreich authentifiziert und kann auf die für seine Rolle vorgesehenen geschützten Funktionen zugreifen.

---

## Test 5 – Raumfinder

1. Raumfinder öffnen.
2. Ein Gebäude auswählen.
3. Räume laden.
4. Einen Zeitraum auswählen.
5. Prüfen, ob freie Räume angezeigt werden.

**Erwartetes Ergebnis:**

Die verfügbaren beziehungsweise freien Räume werden für den ausgewählten Zeitraum angezeigt.

---

## Test 6 – Raumbelegung

1. Mit einem normalen Benutzerkonto einloggen.
2. Einen freien Raum auswählen.
3. Einen Zeitraum auswählen.
4. Raum belegen.
5. Prüfen, ob die Belegung gespeichert wurde.

Anschließend kann versucht werden, denselben Raum im gleichen Zeitraum erneut zu belegen.

**Erwartetes Ergebnis:**

Die zeitliche Überschneidung wird erkannt und die zweite Belegung wird abgelehnt.

---

## Test 7 – Administrationsbereich

1. Mit dem bereitgestellten Administratorkonto anmelden.
2. Administrationsbereich öffnen.
3. Verfügbare administrative Funktionen prüfen.
4. Eine administrative Funktion testweise aufrufen.

**Erwartetes Ergebnis:**

Der Administrator kann auf die für seine Rolle vorgesehenen Funktionen zugreifen.

Ein normaler Benutzer darf keinen Zugriff auf ausschließlich administrative Funktionen erhalten.

---

## Test 8 – Fehlerfälle

Zusätzlich können folgende Fehlerfälle getestet werden:

* Backend nicht erreichbar
* ungültige Eingaben
* Zugriff ohne Authentifizierung
* Zugriff ohne ausreichende Berechtigung
* bereits belegter Raum
* nicht vorhandene Belegung beim Löschen
* externe Schnittstelle nicht erreichbar

---

# 20. Fehlerbehebung

## Backend startet nicht

Zunächst prüfen, ob die virtuelle Umgebung aktiviert wurde:

```bash
python --version
pip --version
```

Anschließend können die Abhängigkeiten erneut installiert werden:

```bash
pip install -r requirements.txt
```

Wichtig ist außerdem, dass das Backend aus dem richtigen Verzeichnis gestartet wird:

```bash
cd backend
uvicorn main:app --reload
```

Nicht:

```bash
uvicorn backend.main:app --reload
```

---

## `ModuleNotFoundError: No module named 'routers'`

Wenn folgende Fehlermeldung erscheint:

```text
ModuleNotFoundError: No module named 'routers'
```

wurde das Backend wahrscheinlich aus dem falschen Verzeichnis gestartet.

Lösung:

```bash
cd backend
uvicorn main:app --reload
```

---

## Datenbankfehler

Bei Datenbankfehlern sollte zunächst geprüft werden, ob die verwendete Datenbankkonfiguration verfügbar und korrekt ist.

Insbesondere sollte die Konfiguration der Datenbankverbindung überprüft werden.

---

## 401-Fehler

Ein `401`-Fehler weist normalerweise darauf hin, dass der Benutzer nicht korrekt authentifiziert ist.

In diesem Fall:

1. erneut anmelden
2. Zugangsdaten prüfen
3. anschließend die geschützte Funktion erneut aufrufen

---

## 403-Fehler

Ein `403`-Fehler weist auf fehlende Berechtigungen hin.

Insbesondere administrative Funktionen benötigen die entsprechenden Berechtigungen.

Für die Überprüfung des Administrationsbereichs sollte das bereitgestellte Administratorkonto verwendet werden.

---

## Frontend startet nicht

Zunächst prüfen, ob Node.js und npm installiert sind.

Danach:

```bash
cd frontend
npm install
npm run dev
```

---

## Frontend kann Backend nicht erreichen

Prüfen, ob das Backend läuft:

```text
http://localhost:8000
```

und ob die Swagger-Dokumentation erreichbar ist:

```text
http://localhost:8000/docs
```

Anschließend das Frontend erneut starten:

```bash
cd frontend
npm run dev
```

---

## E-Mail-Versand funktioniert nicht

Der E-Mail-Versand benötigt eine funktionierende SMTP-Konfiguration.

Wenn diese nicht vorhanden oder ungültig ist, können die übrigen Funktionen des Portals trotzdem getestet werden.

---

# 21. Erweiterung und Wartung

Durch die Trennung von Frontend, Backend und einzelnen API-Routern kann das Projekt modular erweitert werden.

Neue Backend-Funktionen können beispielsweise als eigene Router unter folgendem Verzeichnis ergänzt werden:

```text
backend/routers/
```

Änderungen an bestehenden API-Endpunkten müssen sowohl im Backend als auch bei den entsprechenden Frontend-Aufrufen berücksichtigt werden.

Neue Funktionen sollten anschließend über die Swagger-Dokumentation und die Benutzeroberfläche getestet werden.

---

# 22. Bekannte Einschränkungen

Der aktuelle Projektstand besitzt unter anderem folgende Einschränkungen:

* Es existieren keine umfangreichen automatisierten End-to-End-Tests.
* Einige externe Datenquellen sind von ihrer jeweiligen Verfügbarkeit abhängig.
* Bestimmte Funktionen benötigen externe Dienste beziehungsweise entsprechende Konfigurationen.
* Die Aktualität externer Informationen kann nicht vollständig durch das Portal kontrolliert werden.

---

# 23. Entwicklung und Repository

Die Entwicklung des Projekts wurde über Git und GitHub versioniert.

Das vollständige Repository ist unter folgendem Link erreichbar:

https://github.com/Martin-cuda/campus-informations-portal-HSMW

Die Commit-Historie dokumentiert die Entwicklung des Projekts und ermöglicht die Nachvollziehbarkeit wesentlicher Änderungen.

---

# 24. Kurzfassung – Startbefehle

## Backend

Im Projekt-Hauptverzeichnis:

```bash
python -m venv .venv
```

Virtuelle Umgebung aktivieren und anschließend:

```bash
pip install -r requirements.txt
cd backend
uvicorn main:app --reload
```

## Frontend

In einem zweiten Terminal im Projekt-Hauptverzeichnis:

```bash
cd frontend
npm install
npm run dev
```

## Anwendung öffnen

```text
Frontend:
http://localhost:5173/

Backend:
http://localhost:8000

Swagger:
http://localhost:8000/docs
```

Das Backend und das Frontend müssen gleichzeitig laufen, damit die vollständige Anwendung verwendet werden kann.
