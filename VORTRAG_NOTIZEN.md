# bttrhsmw – Campus-Informationsportal HS Mittweida
## Notizen für den Vortrag (Stand: heute)

Dieses Dokument fasst zusammen, was das Portal kann und was heute alles verbessert/ergänzt
wurde. Bewusst feature- und nutzenorientiert, nicht code-technisch. Gut geeignet, um es in
einen neuen Chat zu kopieren oder als Spickzettel für die Präsentation zu nutzen.

---

## 1. Was ist das Projekt – in einem Satz

Ein modulares Web-Portal für die Hochschule Mittweida, das verschiedene Campus-Dienste
(Mensa-Speiseplan, Raumfinder, Mitarbeiter-Kontakte, News) an einer Stelle bündelt – plus
ein Admin-Bereich, mit dem man ohne Programmieren neue Module/Inhaltsseiten anlegen und den
Betrieb live überwachen kann.

---

## 2. Die wichtigsten Features (für die Demo)

### Startseite (Dashboard für alle)
- Persönliche Begrüßung + aktuelles Datum.
- Drei Live-Info-Karten (Mensa-Gerichte heute, freie Räume, Anzahl Kontakte) – **anklickbar**,
  führen direkt ins jeweilige Modul.
- Modul-Kacheln mit Kurzbeschreibung.
- Großes Campus-Foto, Hell-/Dunkel-Modus.

### Mensa
- Tagesaktueller Speiseplan der HSMW-Mensa (Daten direkt von der offiziellen HSMW-API).
- Studierenden-Preise, Kategorien, Allergie-/Legende-Seite.
- **Mensa-Mail-Benachrichtigung:** Man hinterlegt ein Lieblings-Stichwort (z. B. „Currywurst").
  Sobald das Gericht auf dem Speiseplan steht, kommt automatisch eine E-Mail. Mit
  Bestätigungs-Mail (Doppel-Opt-In) und Abmelde-Link.

### Raumfinder
- Übersicht aller Räume/Hörsäle inkl. Belegung (frei/belegt).

### Kontakte
- Mitarbeiter-Verzeichnis mit Suche, Foto, E-Mail, Durchwahl.

### Admin-Bereich
- Login, Passwort-Reset per E-Mail.
- **Modul-Verwaltung:** eigene Module anlegen, sortieren, aktivieren/deaktivieren, archivieren.
- **Eigenes Modul erstellen** mit Live-Vorschau (siehe unten – das Highlight).
- **Admin-Live-Dashboard:** Besuchszahlen, Antwortzeiten, Top-Seiten, letzte Requests,
  Server-Gesundheit – in Echtzeit.

---

## 3. Was wir HEUTE verbessert/neu gemacht haben

### A) „Eigenes Modul erstellen" – komplett neu (das Highlight)
- **Vorher:** unübersichtliches Formular; die „Vorschau" zeigte nur Textzähler („2 Abschnitte"),
  das Banner-Bild gar nicht. Man sah nicht, wie die Seite am Ende aussieht.
- **Jetzt:** ein zweispaltiger Baukasten.
  - Links: Eingabe in klaren Schritten – Name, Icon (Schnellauswahl per Klick), Akzentfarbe
    (inkl. eigener Farbe), Banner-Bild, beliebig viele Inhalts-Abschnitte und externe Links.
    Mit Zeichenzählern und Live-Anzeige der entstehenden Adresse.
  - Rechts: eine **echte Live-Vorschau**, die die fertige Modulseite 1:1 zeigt – das Banner-Bild
    wird wirklich angezeigt, Abschnitte als Karten, Links als Buttons, alles in der gewählten
    Farbe, sogar mit nachgebauter Navigationsleiste und Adresse. Aktualisiert sich beim Tippen
    und bleibt beim Scrollen sichtbar.
- **Nutzen für den Vortrag:** „Admins bauen neue Inhaltsseiten ohne eine Zeile Code – und sehen
  sofort, wie es aussieht (What-You-See-Is-What-You-Get)."

### B) Mensa schneller gemacht
- Die Mensa-Seite/das Widget brauchten ~3,3 Sekunden, weil bei jedem Aufruf die (langsame)
  HSMW-API neu abgefragt wurde.
- Jetzt: kurzer Zwischenspeicher (5 Minuten). Der erste Aufruf holt die Daten, alle weiteren
  kommen praktisch sofort. Der Plan ändert sich eh nur täglich.

### C) Admin-Dashboard überarbeitet – „viele Zahlen" → „klare Aussagen"
- **Gesundheits-Banner** ganz oben: grün „alles stabil" oder rot „X echte Serverfehler" – das
  Wichtigste auf einen Blick.
- **Richtige Deutung der HTTP-Statuscodes** (wichtiger Punkt, falls der Dozent darauf achtet):
  Ein „404 – nicht gefunden" ist **kein** Serverausfall (oft nur Bots oder alte Links). Vorher
  wurde alles ab 400 als „Fehler" gezählt. Jetzt sauber getrennt: 2xx OK, 3xx Weiterleitung,
  4xx Client, 404 separat, 5xx Serverfehler. Nur echte 5xx gelten als Ausfall.
- Verteilungs-Balken der Status-Klassen, farbige Status-Markierungen (404 neutral-grau, nur 5xx rot).
- Aussagekräftige Kennzahlen: Besuche gesamt/24h/1h, Ø Antwortzeit, eindeutige Besucher (IPs),
  Serverfehler, 404 separat.
- **„Visits zurücksetzen"-Knopf**: setzt die Statistik wieder auf 0 (mit Sicherheitsabfrage).
- **Realistischere Besuchszählung:** dieselbe Person, die schnell mehrfach dieselbe Seite lädt,
  wird kurzzeitig nur einmal gezählt (vorher trieb ein einzelner Klick die Zahl stark hoch).

### D) Mensa-E-Mail „scharf geschaltet"
- Die komplette Kette war gebaut (Abo → Bestätigungs-Mail → täglicher Check um 08:00 → „Dein
  Gericht ist heute da"-Mail). Jetzt nutzt sie zuverlässig dieselbe E-Mail-Infrastruktur wie der
  Passwort-Reset (SendGrid), sodass echte Mails rausgehen.

### E) Diverse Fixes & Performance
- Admin-Dashboard war über die Navigation nicht erreichbar → Link korrigiert.
- Nach „Modul erstellen/aktivieren" bleibt man jetzt in der Verwaltung (vorher rausgeworfen).
- Langsames Laden behoben (die Seite sprach teils eine falsche, fest verdrahtete Adresse an).
- Schriften laden schneller (nicht mehr blockierend), statische Dateien werden gecacht.
- Kompression (gzip/zstd) ist aktiv – Seiten/Antworten werden komprimiert ausgeliefert.

---

## 4. Technik-Überblick (nur zur Einordnung, bewusst oberflächlich)

- **Frontend:** React (Single-Page-App), React Router; Entwicklung/Build mit Vite.
- **Backend:** FastAPI (Python) als REST-API, SQLAlchemy für die Datenbank, httpx für externe
  API-Aufrufe.
- **E-Mail:** SendGrid (Versand der Bestätigungs-, Treffer- und Passwort-Reset-Mails).
- **Automatisierung:** APScheduler – ein Hintergrund-Job, der täglich um 08:00 den Speiseplan
  prüft und Mails verschickt.
- **Auslieferung:** Caddy als Webserver/Proxy mit Kompression; im Entwicklungsmodus Vite, optional
  ein Cloudflare-Tunnel, um die lokale Seite kurz öffentlich zu zeigen.
- **Externe Datenquellen:** offizielle HSMW-Speiseplan-API, Kontakt-/Mitarbeiterdaten, Räume.
- **Team:** Martin Weber, Jerome Martin, Ari Richter, Fabian Busse (Modul Informatik II).

---

## 5. Vorgeschlagener Demo-Ablauf (roter Faden)

1. **Startseite** zeigen: Begrüßung, Live-Karten, eine Karte anklicken.
2. **Mensa**: Speiseplan öffnen (jetzt schnell). Kurz die **Mail-Benachrichtigung** zeigen:
   Stichwort eintragen → „Bestätigungs-Mail wurde versendet".
3. **Als Admin einloggen** → **Modul-Verwaltung** → **Eigenes Modul erstellen**: Name, Icon,
   Farbe, Banner-Bild eingeben und live in der Vorschau sehen → aktivieren → das neue Modul taucht
   in der Navigation auf.
4. **Admin-Dashboard**: Live-Metriken, Gesundheits-Banner, Status-Verteilung erklären
   (404 ≠ Serverfehler), dann **„Visits zurücksetzen"** demonstrieren.
5. Abschluss: kurz die Technik/Architektur nennen (Folie aus Abschnitt 4).

---

## 6. Starke Sätze / Highlights für die Präsentation

- „Admins erstellen neue Inhaltsseiten ohne Code – mit Sofort-Vorschau (WYSIWYG)."
- „Wir behandeln HTTP-Statuscodes semantisch korrekt: 404 heißt ‚nicht gefunden', nicht ‚Ausfall'."
- „Performance gedacht: Caching, Kompression, schnelle Ladezeiten statt jedes Mal die langsame
  Fremd-API zu treffen."
- „Automatisierung: tägliche Mensa-Mails laufen von selbst – kein manuelles Zutun."
- „Betriebssicht: ein Live-Dashboard zeigt Gesundheit, Antwortzeiten und Top-Seiten in Echtzeit."
- „Modular aufgebaut – neue Dienste lassen sich anstecken, ohne den Rest anzufassen."

---

## 7. Voraussetzungen & Demo-Befehle

**Backend starten (im Ordner `backend`, mit dem Projekt-venv – da sind alle Pakete drin):**
```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**Frontend (Entwicklung):**
```powershell
.\scripts\start-frontend-dev.ps1
```

**Für echte E-Mails** muss in der `.env` Folgendes gesetzt sein (ist für den Passwort-Reset eh nötig):
- `SENDGRID_API_KEY` – der SendGrid-Schlüssel
- `MAIL_FROM` – ein in SendGrid verifizierter Absender
- Ohne diese Werte läuft der Mailer im „Trockenmodus": die Mail wird nur protokolliert, die App
  funktioniert aber normal weiter (gut zum Zeigen ohne echten Versand).

**Mensa-Mail sofort testen** (ohne auf 08:00 zu warten), als eingeloggter Admin:
- den Endpunkt `POST /api/mensa/notify/run-now` aufrufen – er prüft sofort den heutigen Plan und
  schickt an alle bestätigten Abos, deren Stichwort passt.

---

## 8. Mögliche Nachfragen (und kurze Antworten)

- **„Werden persönliche Daten gespeichert?"** Für die Besuchsstatistik nur grobe Infos (Pfad,
  Zeit, IP als grobe Besucher-Heuristik) – kein Tracking einzelner Personen.
- **„Was, wenn die HSMW-API ausfällt?"** Dann meldet die Mensa-Seite sauber „nicht erreichbar"
  (Status 503); der Rest des Portals läuft weiter.
- **„Was passiert am Wochenende ohne Speiseplan?"** Es kommt kein Fehler, sondern „Heute kein Plan".
- **„Skaliert das?"** Häufige Abfragen werden zwischengespeichert, Antworten komprimiert; die
  Statistik-Abfragen sind für schnelle Zeitfenster-Auswertungen indiziert.
