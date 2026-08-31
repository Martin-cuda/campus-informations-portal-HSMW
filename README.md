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

## 1. Voraussetzungen

Für die lokale Ausführung werden folgende Komponenten benötigt:

### Backend

* Python 3.11 oder neuer
* `pip`
* PostgreSQL-Datenbank bzw. eine kompatible PostgreSQL-Instanz
* Internetzugang für externe Schnittstellen

### Frontend

* Node.js
* npm

### Optionale beziehungsweise funktionsabhängige Dienste

Je nach verwendeten Funktionen werden zusätzlich Zugangsdaten für externe Dienste benötigt:

* PostgreSQL / Neon für die Datenbank
* SMTP-Zugang für den Versand von E-Mails
* gegebenenfalls weitere Zugangsdaten für externe APIs

---

## 2. Projektstruktur

Das Projekt ist in Frontend und Backend aufgeteilt:

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

Das Backend basiert auf **FastAPI** und übernimmt unter anderem die REST-Schnittstellen, Authentifizierung, Datenbankzugriffe und Geschäftslogik.

Das Frontend stellt die Benutzeroberfläche bereit und kommuniziert über die REST-API mit dem Backend.

---

## 3. Repository klonen

Das Projekt kann mit Git geklont werden:

```bash
git clone https://github.com/Martin-cuda/campus-informations-portal-HSMW.git
cd campus-informations-portal-HSMW
```

---

## 4. Backend einrichten

Für das Backend wird eine virtuelle Python-Umgebung verwendet.

### 4.1 Virtuelle Umgebung erstellen

Der folgende Befehl wird im **Projekt-Hauptverzeichnis** ausgeführt:

```bash
python -m venv .venv
```

### 4.2 Virtuelle Umgebung aktivieren

#### Windows – Eingabeaufforderung (CMD)

```cmd
.venv\Scripts\activate
```

#### Windows – PowerShell

```powershell
.venv\Scripts\Activate.ps1
```

#### Linux / macOS

```bash
source .venv/bin/activate
```

Nach erfolgreicher Aktivierung sollte `(.venv)` am Anfang der Terminalzeile angezeigt werden.

---

## 5. Python-Abhängigkeiten installieren

Nach Aktivierung der virtuellen Umgebung werden die benötigten Python-Pakete installiert:

```bash
pip install -r requirements.txt
```

Die Abhängigkeiten des Backends sind in der Datei `requirements.txt` definiert.

---

## 6. Umgebungsvariablen konfigurieren

Für den Betrieb des Backends werden verschiedene Konfigurationswerte benötigt.

Dazu gehören insbesondere Einstellungen für:

* Datenbankverbindung
* Authentifizierung
* Backend-URL
* Frontend-URL
* gegebenenfalls E-Mail-Versand

Beispielsweise werden folgende Umgebungsvariablen verwendet:

```text
DATABASE_URL=<PostgreSQL-Verbindungsstring>
SECRET_KEY=<geheimer-Schlüssel>
PUBLIC_BASE_URL=http://localhost:8000
FRONTEND_BASE_URL=http://localhost:5173
```

Für Funktionen wie den E-Mail-Versand müssen zusätzlich die entsprechenden SMTP-Zugangsdaten konfiguriert werden.

> **Wichtig:** Echte Zugangsdaten, Passwörter, API-Schlüssel oder geheime Schlüssel dürfen nicht in das Git-Repository eingecheckt werden.

Die benötigten Umgebungsvariablen müssen vor dem Start des Backends entsprechend der lokalen beziehungsweise bereitgestellten Konfiguration gesetzt werden.

---

## 7. Backend starten

Für den Start des Backends wird zunächst in das Backend-Verzeichnis gewechselt:

```bash
cd backend
```

Anschließend wird der FastAPI-Server gestartet:

```bash
uvicorn main:app --reload
```

Das Backend ist anschließend unter folgender Adresse erreichbar:

```text
http://localhost:8000
```

Die automatisch generierte Swagger-Dokumentation der REST-API ist unter folgender Adresse erreichbar:

```text
http://localhost:8000/docs
```

> **Wichtig:** Der Befehl `uvicorn main:app --reload` muss aus dem `backend`-Verzeichnis ausgeführt werden. Das Backend verwendet Module aus diesem Verzeichnis, unter anderem die Router unter `backend/routers/`.

Das Terminal mit dem laufenden Backend muss während der Nutzung des Frontends geöffnet bleiben.

---

## 8. Frontend einrichten

Das Frontend wird in einem **zweiten Terminal-Fenster** gestartet.

Das zweite Terminal sollte im Projekt-Hauptverzeichnis geöffnet werden.

Anschließend:

```bash
cd frontend
```

Die benötigten Node.js-Abhängigkeiten werden mit folgendem Befehl installiert:

```bash
npm install
```

---

## 9. Frontend starten

Nach der Installation der Abhängigkeiten wird der Entwicklungsserver gestartet:

```bash
npm run dev
```

Das Frontend ist anschließend normalerweise unter folgender Adresse erreichbar:

```text
http://localhost:5173/
```

---

## 10. Projekt starten – vollständiger Ablauf

Für die lokale Ausführung werden **zwei separate Terminal-Fenster** benötigt.

### Terminal 1 – Backend

Im Projekt-Hauptverzeichnis:

```bash
python -m venv .venv
```

Virtuelle Umgebung aktivieren.

**Windows CMD:**

```cmd
.venv\Scripts\activate
```

**Windows PowerShell:**

```powershell
.venv\Scripts\Activate.ps1
```

**Linux / macOS:**

```bash
source .venv/bin/activate
```

Danach:

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

### Terminal 2 – Frontend

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

## 11. Übersicht der wichtigsten Adressen

| Komponente                | Adresse                    |
| ------------------------- | -------------------------- |
| Frontend                  | http://localhost:5173/     |
| Backend                   | http://localhost:8000      |
| Swagger API-Dokumentation | http://localhost:8000/docs |

---

## 12. Authentifizierung

Bestimmte Funktionen des Portals sind nur für eingeloggte Nutzer verfügbar.

Dazu gehört insbesondere die Verwaltung von Raumbelegungen.

Das Backend überprüft bei geschützten Endpunkten, ob ein gültiger authentifizierter Benutzer vorhanden ist.

Die Authentifizierung und sicherheitsbezogene Funktionen werden unter anderem über folgende Dateien umgesetzt:

```text
backend/auth.py
backend/security.py
```

---

## 13. Wichtige Funktionen

### 13.1 News

Das Portal stellt aktuelle Hochschul-News zur Verfügung.

Die News können über das entsprechende Frontend-Modul aufgerufen werden.

Für administrative Nutzer stehen zusätzliche Funktionen zur Verwaltung von News zur Verfügung.

### 13.2 Mensa

Das Mensa-Modul stellt Informationen zum aktuellen Speiseangebot bereit.

Zusätzlich ist eine Benachrichtigungsfunktion vorhanden, über die Nutzer über entsprechende Mensa-Informationen per E-Mail informiert werden können.

Für den E-Mail-Versand müssen die entsprechenden SMTP-Zugangsdaten konfiguriert sein.

### 13.3 Module

Das Modul-System stellt Informationen zu Studienmodulen bereit.

Die Informationen können innerhalb des Portals aufgerufen und strukturiert dargestellt werden.

### 13.4 Raumfinder

Der Raumfinder ermöglicht die Suche nach geeigneten beziehungsweise freien Räumen.

Dabei können unter anderem:

* Gebäude ausgewählt werden
* Räume angezeigt werden
* Zeiträume berücksichtigt werden
* Raumbelegungen vorgenommen werden

### 13.5 Raumbelegung

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

## 14. REST-API

Das Backend basiert auf FastAPI und stellt REST-Endpunkte für die einzelnen Funktionsbereiche bereit.

Dazu gehören unter anderem Schnittstellen für:

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

## 15. Administrationsbereich

Das Projekt besitzt einen geschützten Administrationsbereich.

Administrative Funktionen sind durch zusätzliche Berechtigungsprüfungen geschützt.

Die entsprechenden Berechtigungsprüfungen werden unter anderem über folgende Komponente umgesetzt:

```text
backend/admin_guard.py
```

---

## 16. Dark Mode und responsive Darstellung

Das Frontend unterstützt einen Dark Mode.

Die Benutzeroberfläche wurde außerdem für unterschiedliche Bildschirmgrößen angepasst, sodass das Portal sowohl auf Desktop-Computern als auch auf mobilen Geräten verwendet werden kann.

---

## 17. Testen der Anwendung

Nach dem Start von Backend und Frontend können die wichtigsten Funktionen manuell getestet werden.

### Test 1 – Anwendung starten

1. Backend starten.
2. Frontend starten.
3. `http://localhost:5173/` im Browser öffnen.
4. Prüfen, ob die Startseite korrekt geladen wird.

### Test 2 – News

1. News-Bereich öffnen.
2. Prüfen, ob News geladen werden.
3. Eine News öffnen.
4. Prüfen, ob die Inhalte korrekt dargestellt werden.

### Test 3 – Mensa

1. Mensa-Bereich öffnen.
2. Prüfen, ob die Mensa-Informationen geladen werden.
3. Prüfen, ob die Gerichte korrekt dargestellt werden.

### Test 4 – Login

1. Login-Seite öffnen.
2. Mit gültigen Zugangsdaten anmelden.
3. Prüfen, ob die Anmeldung erfolgreich durchgeführt wird.
4. Eine geschützte Funktion aufrufen.

### Test 5 – Raumfinder

1. Raumfinder öffnen.
2. Ein Gebäude auswählen.
3. Räume laden.
4. Einen Zeitraum auswählen.
5. Prüfen, ob freie Räume angezeigt werden.

### Test 6 – Raumbelegung

1. Einloggen.
2. Einen freien Raum auswählen.
3. Einen Zeitraum auswählen.
4. Raum belegen.
5. Prüfen, ob die Belegung gespeichert wurde.

Anschließend kann versucht werden, denselben Raum im gleichen Zeitraum erneut zu belegen.

Erwartetes Ergebnis:

```text
Die zeitliche Überschneidung wird erkannt
und die zweite Belegung wird abgelehnt.
```

### Test 7 – Fehlerfälle

Zusätzlich können folgende Fehlerfälle getestet werden:

* Backend nicht erreichbar
* ungültige Eingaben
* Zugriff ohne Authentifizierung
* Zugriff ohne ausreichende Berechtigung
* bereits belegter Raum
* nicht vorhandene Belegung beim Löschen
* externe Schnittstelle nicht erreichbar

---

## 18. Fehlerbehebung

Bei Problemen können zunächst folgende Punkte überprüft werden:

| Problem                           | Mögliche Ursache                                         |
| --------------------------------- | -------------------------------------------------------- |
| Backend startet nicht             | Abhängigkeiten nicht installiert                         |
| `ModuleNotFoundError`             | Backend nicht aus dem `backend`-Verzeichnis gestartet    |
| Datenbankfehler                   | `DATABASE_URL` fehlt oder ist ungültig                   |
| 401-Fehler                        | Benutzer nicht authentifiziert                           |
| 403-Fehler                        | Fehlende Berechtigung                                    |
| Frontend startet nicht            | Node.js/npm nicht installiert oder Abhängigkeiten fehlen |
| Frontend kann API nicht erreichen | Backend läuft nicht                                      |
| E-Mail-Versand funktioniert nicht | SMTP-Konfiguration fehlt oder ist ungültig               |

Bei einem Python-Fehler sollte zunächst geprüft werden, ob die virtuelle Umgebung aktiviert wurde:

```bash
python --version
pip --version
```

Außerdem sollten die Abhängigkeiten erneut installiert werden:

```bash
pip install -r requirements.txt
```

---

## 19. Erweiterung und Wartung

Durch die Trennung von Frontend, Backend und einzelnen API-Routern kann das Projekt modular erweitert werden.

Neue Backend-Funktionen können beispielsweise als eigener Router ergänzt werden:

```text
backend/routers/
```

Neue Datenbankobjekte können als entsprechende Datenbankmodelle umgesetzt werden.

Neue Benutzeroberflächen können im Frontend als zusätzliche Komponenten beziehungsweise Seiten ergänzt werden.

Bei Änderungen an bestehenden API-Endpunkten sollten sowohl Backend als auch die entsprechenden Frontend-Aufrufe angepasst und anschließend getestet werden.

---

## 20. Bekannte Einschränkungen

Trotz des funktionsfähigen Projektstands bestehen einige Einschränkungen:

* Es existieren keine umfangreichen automatisierten End-to-End-Tests.
* Einige externe Datenquellen sind von ihrer jeweiligen Verfügbarkeit abhängig.
* Für bestimmte Funktionen werden externe Dienste beziehungsweise Zugangsdaten benötigt.
* Die Aktualität externer Informationen kann nicht vollständig durch das Portal kontrolliert werden.

---

## 21. Repository und Entwicklung

Die Entwicklung des Projekts wurde über Git und GitHub versioniert.

Das vollständige Repository ist unter folgendem Link erreichbar:

https://github.com/Martin-cuda/campus-informations-portal-HSMW

Die Commit-Historie dokumentiert die Entwicklung des Projekts und ermöglicht die Nachvollziehbarkeit wesentlicher Änderungen.

---

## 22. Kurzfassung für den Start

### Backend

```bash
python -m venv .venv
```

Virtuelle Umgebung aktivieren und anschließend:

```bash
pip install -r requirements.txt
cd backend
uvicorn main:app --reload
```

### Frontend

In einem zweiten Terminal im Projekt-Hauptverzeichnis:

```bash
cd frontend
npm install
npm run dev
```

Danach:

```text
Frontend:
http://localhost:5173/

Backend:
http://localhost:8000

Swagger:
http://localhost:8000/docs
```

Damit ist das Campus Informationsportal lokal gestartet.
