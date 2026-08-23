// ── FABIAN (ORIGINAL) ─────────────────────────────────────────────────────
// Raumfinder-Seite: zeigt Gebäude und Räume, erlaubt Belegungs-Toggle.
//
// Features:
//   - Lazy Loading: Räume werden erst beim Anklicken eines Hauses geladen
//   - Suchfeld: Gebäude können nach Name gefiltert werden
//   - Belegungskalender: zeigt alle Belegungen eines Raums als Tagesstrahl
//   - Login-Schutz: Belegen/Freigeben nur für eingeloggte Nutzer
//   - Mehrere Belegungen pro Raum möglich (eigene ID pro Belegung)
// ──────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";

const API_URL = "";

// Reihenfolge der Etagen für die Sortierung (KG = Keller, EG = Erdgeschoss usw.)
// Ohne diese Tabelle würde "1. OG" alphabetisch vor "EG" sortiert werden
const etagenReihenfolge = { "KG": 0, "EG": 1, "1. OG": 2, "2. OG": 3, "3. OG": 4, "4. OG": 5 };

// Sortiert Räume zweistufig:
// 1. Nach Etage (über die Lookup-Tabelle oben, damit KG vor EG vor 1.OG usw.)
// 2. Innerhalb der Etage numerisch nach Raumnummer (damit 1-019 vor 1-020 kommt)
function raeumeSortieren(raeume) {
  return [...raeume].sort((a, b) => {
    const etageA = etagenReihenfolge[a.etage] ?? 99;
    const etageB = etagenReihenfolge[b.etage] ?? 99;
    if (etageA !== etageB) return etageA - etageB;
    // numeric: true verhindert alphabetische Fehlsortierung bei Raumnummern
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });
}

// Prüft ob ein Raum im angegebenen Zeitfilter-Slot belegt ist
// Gibt true zurück wenn sich der Belegungszeitraum mit dem Filterzeitraum überschneidet
function istBelegtImZeitslot(raum, von, bis) {
  if (!raum.belegt || !raum.von || !raum.bis || !von || !bis) return false;
  // Überschneidung: Raum-von < Filter-bis UND Raum-bis > Filter-von
  return raum.von < bis && raum.bis > von;
}
// Berechnet die freien Zeitblöcke eines Raums basierend auf seinen Belegungen.
// Gibt eine Liste von { von, bis, dauerMin } zurück.
// Blöcke unter 60 Minuten werden als nicht buchbar markiert.
function freieZeitbloecke(belegungen) {
  const tagesStart = "08:00";
  const tagesEnde = "20:00";
  const alleZeiten = [
    { von: tagesStart, bis: tagesStart },
    ...belegungen.map((b) => ({ von: b.von, bis: b.bis })),
    { von: tagesEnde, bis: tagesEnde },
  ].sort((a, b) => a.von.localeCompare(b.von));

  const bloecke = [];
  for (let i = 0; i < alleZeiten.length - 1; i++) {
    const freiVon = alleZeiten[i].bis;
    const freiBis = alleZeiten[i + 1].von;
    if (freiVon >= freiBis) continue;
    const [vonH, vonM] = freiVon.split(":").map(Number);
    const [bisH, bisM] = freiBis.split(":").map(Number);
    const dauerMin = (bisH * 60 + bisM) - (vonH * 60 + vonM);
    bloecke.push({ von: freiVon, bis: freiBis, dauerMin });
  }
  return bloecke;
}

// Berechnet das maximale Bis-Zeit für eine neue Belegung:
// minimum aus (von + 3 Stunden) und dem Ende des freien Blocks
function maxBisZeit(freiVon, freiBis) {
  const [vonH, vonM] = freiVon.split(":").map(Number);
  const maxMin = vonH * 60 + vonM + 180; // +3 Stunden
  const maxH = Math.floor(maxMin / 60);
  const maxM = maxMin % 60;
  const maxZeit = `${String(maxH).padStart(2, "0")}:${String(maxM).padStart(2, "0")}`;
  // Kleineres der beiden Limits nehmen
  return maxZeit < freiBis ? maxZeit : freiBis;
}

export default function Raumfinder() {

  // ── State-Variablen ────────────────────────────────────────────────────
  const [haeuser, setHaeuser] = useState([]);
  // haeuser = Liste aller Gebäude (beim Start nur Name+ID, Räume werden lazy nachgeladen)

  const [ausgewaehltesHaus, setAusgewaehltesHaus] = useState(null);
  // ausgewaehltesHaus = aktuell angeklicktes Gebäude (null = keins ausgewählt)

  const [hausFilter, setHausFilter] = useState("");
  // hausFilter = Suchtext im Gebäude-Suchfeld, filtert die Haus-Buttons in Echtzeit

  const [ausgewaehltesRaum, setAusgewaehltesRaum] = useState(null);
  // ausgewaehltesRaum = aktuell angeklickter Raum (null = keins ausgewählt)

  const [formular, setFormular] = useState({ professor: "", modul: "", von: "", bis: "" });
  // formular = Eingabewerte für die neue Belegung (Professor, Modul, Von, Bis)

  // ── Filter State ──────────────────────────────────────────────────────
  const [filterEtage, setFilterEtage] = useState("");
  // filterEtage = gewählte Etage im Dropdown ("" = alle Etagen)

  const [filterVon, setFilterVon] = useState("");
  // filterVon = Zeitfilter Von (z.B. "10:00")

  const [filterBis, setFilterBis] = useState("");
  // filterBis = Zeitfilter Bis (z.B. "12:00")

  const [nurFreie, setNurFreie] = useState(false);
  // nurFreie = wenn true, werden im Zeitfilter-Slot belegte Räume ausgeblendet

  const [ladeRaeume, setLadeRaeume] = useState(false);
  // ladeRaeume = true während Räume vom Backend nachgeladen werden (zeigt Ladeanzeige)

  const [ladeFehler, setLadeFehler] = useState(null);
  // ladeFehler = Fehlertext wenn Räume nicht geladen werden konnten (null = kein Fehler)
  const [erfolgsMeldung, setErfolgsMeldung] = useState(null);
  // erfolgsMeldung = grüne Toast-Nachricht nach erfolgreichem Belegen (null = keine)

  // ── Lazy Loading: Beim Start nur die Gebäudeliste laden ───────────────
  // Statt alle 800+ Räume sofort zu laden, holen wir zuerst nur Namen und IDs.
  // Die Räume eines Hauses werden erst beim Anklicken nachgeladen (Lazy Loading).
  // Das macht den Seitenstart deutlich schneller.
  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/haeuser/leicht`).then((r) => r.json()),
      fetch(`${API_URL}/api/haeuser/freie-raeume`).then((r) => r.json()),
    ])
      .then(([haeuserData, freieData]) => {
        // Freie Räume pro Haus als Lookup-Tabelle
        const freieMap = Object.fromEntries(freieData.map((h) => [h.id, h.frei]));
        setHaeuser(haeuserData.map((h) => ({
          ...h,
          raeume: null,
          // Anzahl freier Räume direkt beim Start bekannt
          anzahlFrei: freieMap[h.id] ?? 0,
        })));
      })
      .catch(() => console.warn("Backend nicht erreichbar"));
  }, []);

  // ── Haus anzeigen: Räume lazy nachladen ───────────────────────────────
  // Wenn ein Haus-Button angeklickt wird:
  // - Sind die Räume schon geladen? Direkt anzeigen, kein neuer Request.
  // - Noch nicht geladen? Räume + aktuelle Belegungen vom Backend holen,
  //   dann zusammenführen und anzeigen.
  const hausAnzeigen = async (haus) => {
    setAusgewaehltesRaum(null);
    setLadeFehler(null);

    // Räume bereits geladen → direkt anzeigen
    if (haus.raeume !== null) {
      setAusgewaehltesHaus(haus);
      return;
    }

    setAusgewaehltesHaus(haus);
    setLadeRaeume(true);
    try {
      // Zwei Requests gleichzeitig: Räume des Hauses + alle aktuellen Belegungen
      const [hausDaten, belegungenData] = await Promise.all([
        fetch(`${API_URL}/api/haeuser/${haus.id}/raeume`).then((r) => r.json()),
        fetch(`${API_URL}/api/raeume/`).then((r) => r.json()),
      ]);

      // Belegungen sind jetzt eine Liste (mehrere Belegungen pro Raum möglich)
      const belegungen = belegungenData.belegungen || [];

      // Jeden Raum mit seinen Belegungen zusammenführen
      const raeumeMitBelegungen = hausDaten.raeume.map((r) => {
        // Alle Belegungen für diesen Raum aus der Liste herausfiltern
        const raumBelegungen = belegungen.filter(
          (b) => b.raum_id === r.id && b.haus_id === haus.id
        );
        if (raumBelegungen.length > 0) {
          return {
            ...r,
            belegt: true,
            belegungen: raumBelegungen,
            // erste Belegung für Rückwärtskompatibilität (z.B. Zeitfilter)
            belegung_id: raumBelegungen[0].id,
            professor: raumBelegungen[0].professor,
            modul: raumBelegungen[0].modul,
            von: raumBelegungen[0].von,
            bis: raumBelegungen[0].bis,
          };
        }
        // Kein Belegungseintrag → Raum ist frei
        return { ...r, belegt: false, belegungen: [] };
      });

      const hausMitRaeumen = { ...haus, raeume: raeumeMitBelegungen };
      setHaeuser((prev) => prev.map((h) => (h.id === haus.id ? hausMitRaeumen : h)));
      setAusgewaehltesHaus(hausMitRaeumen);
    } catch (err) {
      console.warn("Räume konnten nicht geladen werden:", err);
      setLadeFehler("Räume konnten nicht geladen werden. Bitte versuche es erneut.");
    } finally {
      setLadeRaeume(false);
    }
  };

  // ── Raum anzeigen/abwählen ────────────────────────────────────────────
  // Klick auf Raum-Kachel: Detailbereich öffnen und Formular befüllen.
  // Klick auf bereits ausgewählten Raum: Detailbereich wieder zuklappen.
  const raumAnzeigen = (raum) => {
    if (ausgewaehltesRaum?.id === raum.id) {
      setAusgewaehltesRaum(null);
      return;
    }
    setAusgewaehltesRaum(raum);
    setFormular({ professor: raum.professor, modul: raum.modul, von: raum.von, bis: raum.bis });
  };

  // ── Belegungs-Toggle mit Login-Schutz ─────────────────────────────────
  // Belegt einen freien Raum oder gibt einen belegten Raum frei.
  // Login-Schutz: Token wird aus dem sessionStorage geholt (Jerome's JWT-System).
  // Ohne gültigen Token wird die Aktion abgebrochen und ein Hinweis angezeigt.
  // Der Token wird als Authorization-Header an das Backend geschickt,
  // das dann prüft ob der Nutzer eingeloggt ist.
  const raumToggle = async () => {
    // Token aus sessionStorage holen (wird beim Admin-Login gespeichert)
    const token = sessionStorage.getItem("token");
    if (!token) {
      // Kein Token = nicht eingeloggt → Aktion abbrechen
      alert("Bitte melde dich zuerst an um einen Raum zu belegen.");
      return;
    }
    const antwort = await fetch(`${API_URL}/api/raeume/belegen`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        haus_id: ausgewaehltesHaus.id,
        raum_id: ausgewaehltesRaum.id,
        professor: formular.professor,
        modul: formular.modul,
        von: formular.von,
        bis: formular.bis,
      }),
    });
    if (!antwort.ok) {
      // Fehlermeldung vom Backend anzeigen (z.B. Zeitüberschneidung)
      const fehler = await antwort.json();
      alert(fehler.detail || "Dieser Zeitraum ist bereits reserviert.");
      return;
    }
    // Erfolgsmeldung anzeigen und nach 3 Sekunden automatisch ausblenden
    setErfolgsMeldung("Raum erfolgreich belegt!");
    setTimeout(() => setErfolgsMeldung(null), 3000);
    // Fenster schließen und Haus neu laden damit Zeitstrahl aktualisiert wird
    setAusgewaehltesRaum(null);
    const hausOhneRaeume = { ...ausgewaehltesHaus, raeume: null };
    setHaeuser((prev) => prev.map((h) => h.id === ausgewaehltesHaus.id ? hausOhneRaeume : h));
    await hausAnzeigen(hausOhneRaeume);
  };

  return (
    <div>
      <div className="page-header module-header module-raumfinder fade-up">
        <div className="page-title">Raumfinder</div>
        <div className="page-subtitle">Gebäude & Belegungsstatus · HS Mittweida</div>
      </div>
            {/* ── Erfolgsmeldung (Toast) ─────────────────────────────────────────
          Erscheint nach erfolgreichem Belegen und verschwindet nach 3 Sekunden */}
      {erfolgsMeldung && (
        <div style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          backgroundColor: "var(--green)",
          color: "white",
          padding: "12px 24px",
          borderRadius: "var(--radius)",
          fontSize: 14,
          fontWeight: 600,
          zIndex: 1000,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          ✓ {erfolgsMeldung}
        </div>
      )}
      {/* ── Häuser-Auswahl mit Suchfeld ────────────────────────────────────
          Das Suchfeld filtert die Haus-Buttons in Echtzeit nach Gebäudename.
          Nur Frontend-Logik, kein Backend-Request nötig.
          Die Buttons selbst lösen das Lazy Loading der Räume aus.        */}
      <div style={{ marginBottom: "1.5rem" }} className="fade-up">
        <input
          type="text"
          placeholder="Gebäude suchen..."
          value={hausFilter}
          onChange={(e) => setHausFilter(e.target.value)}
          style={{
            padding: "10px 16px",
            fontSize: "14px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            backgroundColor: "var(--card)",
            color: "var(--text-primary)",
            fontFamily: "inherit",
            marginBottom: "1rem",
            width: "250px",
            display: "block",
          }}
        />
        {/* Zeitfilter für Haus-Buttons */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Zeitraum Von</label>
            <input
              type="time"
              value={filterVon}
              onChange={(e) => setFilterVon(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--border)", fontFamily: "inherit", fontSize: 13 }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Bis</label>
            <input
              type="time"
              value={filterBis}
              onChange={(e) => setFilterBis(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--border)", fontFamily: "inherit", fontSize: 13 }}
            />
          </div>
          {(filterVon || filterBis) && (
            <button
              onClick={() => { setFilterVon(""); setFilterBis(""); }}
              style={{ padding: "6px 12px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text-primary)", cursor: "pointer", fontSize: 12 }}
            >
              Zeitfilter zurücksetzen
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {haeuser
            .filter((haus) => haus.name.toLowerCase().includes(hausFilter.toLowerCase()))
            .map((haus) => (
              <button
                key={haus.id}
                onClick={() => hausAnzeigen(haus)}
                style={{
                  padding: "10px 24px",
                  fontSize: "14px",
                  cursor: "pointer",
                  backgroundColor: ausgewaehltesHaus?.id === haus.id ? "var(--accent)" : "var(--card)",
                  color: ausgewaehltesHaus?.id === haus.id ? "#fff" : "#374151",
                  border: "1px solid",
                  borderColor: ausgewaehltesHaus?.id === haus.id ? "var(--accent)" : "var(--border)",
                  borderRadius: "var(--radius)",
                  fontFamily: "inherit",
                  fontWeight: ausgewaehltesHaus?.id === haus.id ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >
                {haus.name}
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                  {haus.raeume !== null
                    ? haus.raeume.filter((r) => {
                      if (!filterVon || !filterBis) return !r.belegt;
                      return !(r.belegungen || []).some((b) => b.von < filterBis && b.bis > filterVon);
                    }).length
                    : haus.anzahlFrei} frei
                  {filterVon && filterBis && (
                    <span style={{ opacity: 0.7 }}> ({filterVon}–{filterBis})</span>
                  )}
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* ── Räume des gewählten Hauses ───────────────────────────────────── */}
      {ausgewaehltesHaus && (
        <div className="fade-up">
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "IBM Plex Mono, monospace" }}>
            {ausgewaehltesHaus.name} – Räume
          </div>

          {/* Ladeanzeige während Räume nachgeladen werden (Feedback-Prinzip) */}
          {ladeRaeume && (
            <div className="state-box">
              <div className="state-box-text">Räume werden geladen…</div>
            </div>
          )}

          {/* Fehlermeldung mit "Erneut versuchen"-Button (Fehlertoleranz-Prinzip) */}
          {!ladeRaeume && ladeFehler && (
            <div className="state-box">
              <div className="state-box-text" style={{ color: "var(--red)" }}>{ladeFehler}</div>
              <button
                onClick={() => hausAnzeigen(ausgewaehltesHaus)}
                className="btn-secondary"
                style={{ marginTop: 14 }}
              >
                Erneut versuchen
              </button>
            </div>
          )}

          {!ladeRaeume && !ladeFehler && ausgewaehltesHaus.raeume && (
            <>
              {/* ── Filter-Leiste ──────────────────────────────────────────
                  Drei kombinierbare Filter:
                  1. Etagen-Filter: zeigt nur Räume einer bestimmten Etage
                  2. Zeitfilter Von/Bis: definiert einen Zeitraum
                  3. "Nur freie Räume": blendet im Zeitraum belegte Räume aus     */}
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" }} className="card">
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Etage</label>
                  <select
                    value={filterEtage}
                    onChange={(e) => setFilterEtage(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--border)", fontFamily: "inherit", fontSize: 13 }}
                  >
                    <option value="">Alle Etagen</option>
                    {[...new Set(ausgewaehltesHaus.raeume.map((r) => r.etage))]
                      .sort((a, b) => (etagenReihenfolge[a] ?? 99) - (etagenReihenfolge[b] ?? 99))
                      .map((etage) => (
                        <option key={etage} value={etage}>{etage}</option>
                      ))}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px" }}>
                  <input
                    type="checkbox"
                    id="nurFreie"
                    checked={nurFreie}
                    onChange={(e) => setNurFreie(e.target.checked)}
                  />
                  <label htmlFor="nurFreie" style={{ fontSize: 13, color: "var(--text-primary)", cursor: "pointer" }}>
                    Nur freie Räume anzeigen
                  </label>
                </div>

                <button
                  onClick={() => { setFilterEtage(""); setFilterVon(""); setFilterBis(""); setNurFreie(false); }}
                  style={{ marginTop: "16px", padding: "6px 12px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--text-primary)", cursor: "pointer", fontSize: 12 }}
                >
                  Filter zurücksetzen
                </button>
              </div>

              {/* ── Raum-Kacheln ─────────────────────────────────────────
                  Jede Kachel zeigt Raumnummer, Etage und Belegungsstatus.
                  Grün = frei, Rot = belegt (kulturell etablierte Farbcodierung).
                  Blauer Rand = aktuell ausgewählter Raum.                       */}
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
                {raeumeSortieren(ausgewaehltesHaus.raeume)
                  .filter((raum) => {
                    // Etagen-Filter anwenden
                    if (filterEtage && raum.etage !== filterEtage) return false;
                    // Zeitfilter anwenden: belegte Räume im Zeitslot ausblenden
                    if (nurFreie && istBelegtImZeitslot(raum, filterVon, filterBis)) return false;
                    return true;
                  })
                  .map((raum) => (
                    <div key={raum.id}>
                      {/* Raum-Kachel */}
                      <div
                        onClick={() => raumAnzeigen(raum)}
                        style={{
                          padding: "1rem",
                          width: "150px",
                          textAlign: "center",
                          borderRadius: "var(--radius)",
                          cursor: "pointer",
                          backgroundColor: raum.belegt ? "var(--red)" : "var(--green)",
                          color: "white",
                          fontWeight: "bold",
                          border: "3px solid",
                          borderColor: ausgewaehltesRaum?.id === raum.id ? "var(--blue-hsmw)" : "transparent",
                          transition: "border-color 0.15s",
                        }}
                      >
                        <div>{raum.name}</div>
                        <div style={{ fontSize: "0.8rem", marginTop: 4, opacity: 0.85 }}>{raum.etage}</div>
                        <div style={{ marginTop: 4 }}>{raum.belegt ? "Belegt" : "Frei"}</div>
                      </div>

                      {/* ── Detailbereich (nur beim angeklickten Raum) ──────
                          Zeigt Belegungskalender, Belegungsliste und Formular.
                          Klappt beim erneuten Klick auf die Kachel wieder zu.  */}
                      {ausgewaehltesRaum?.id === raum.id && (
                        <div className="card" style={{ width: "500px", marginTop: "0.5rem", padding: 0, overflow: "hidden" }}>
                          {/* ── Header: Raumname + Status ─────────────────────────── */}
                          <div style={{
                            backgroundColor: ausgewaehltesRaum.belegt ? "var(--red)" : "var(--green)",
                            color: "white",
                            padding: "16px 20px",
                            fontSize: 18,
                            fontWeight: 600,
                            textAlign: "center",
                            borderRadius: "var(--radius) var(--radius) 0 0",
                          }}>
                            {ausgewaehltesRaum.name} — {ausgewaehltesRaum.belegt ? "Belegt" : "Frei"}
                          </div>

                          <div style={{ padding: "16px 20px" }}>
                            {/* ── Interaktiver Zeitstrahl ───────────────────────────── */}
                            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
                              Tagesplan 08:00 – 20:00
                            </div>
                            <div style={{ position: "relative", height: 56, borderRadius: "var(--radius)", overflow: "hidden", display: "flex" }}>
                              {(() => {
                                const tagesStart = 8 * 60;
                                const tagesEnde = 20 * 60;
                                const tagsDauer = tagesEnde - tagesStart;
                                const belegungen = ausgewaehltesRaum.belegungen || [];
                                const zeitpunkte = [
                                  { zeit: "08:00", typ: "start" },
                                  ...belegungen.flatMap((b) => [
                                    { zeit: b.von, typ: "belegt_start", belegung: b },
                                    { zeit: b.bis, typ: "belegt_ende" },
                                  ]),
                                  { zeit: "20:00", typ: "ende" },
                                ].sort((a, b) => a.zeit.localeCompare(b.zeit));
                                const bloecke = [];
                                for (let i = 0; i < zeitpunkte.length - 1; i++) {
                                  const von = zeitpunkte[i].zeit;
                                  const bis = zeitpunkte[i + 1].zeit;
                                  if (von >= bis) continue;
                                  const [vonH, vonM] = von.split(":").map(Number);
                                  const [bisH, bisM] = bis.split(":").map(Number);
                                  const vonMin = vonH * 60 + vonM;
                                  const bisMin = bisH * 60 + bisM;
                                  const breite = ((bisMin - vonMin) / tagsDauer) * 100;
                                  const dauerMin = bisMin - vonMin;
                                  const belegung = belegungen.find((b) => b.von === von);
                                  if (belegung) {
                                    bloecke.push({ von, bis, breite, typ: "belegt", belegung });
                                  } else {
                                    bloecke.push({ von, bis, breite, dauerMin, typ: dauerMin >= 60 ? "frei" : "zu_kurz" });
                                  }
                                }
                                return bloecke.map((block, idx) => {
                                  if (block.typ === "belegt") {
                                    return (
                                      <div key={idx} title={`${block.belegung.professor} – ${block.belegung.modul}`}
                                        style={{ width: `${block.breite}%`, backgroundColor: "var(--red)", height: "100%", cursor: "default", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: "0 4px" }}>
                                        {block.breite > 10 && <>
                                          <div style={{ fontSize: 11, color: "white", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{block.belegung.professor}</div>
                                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap" }}>{block.von}–{block.bis}</div>
                                        </>}
                                      </div>
                                    );
                                  }
                                  if (block.typ === "zu_kurz") {
                                    return (
                                      <div key={idx} title="Zu kurz zum Buchen"
                                        style={{ width: `${block.breite}%`, backgroundColor: "#9ca3af", height: "100%", cursor: "not-allowed" }} />
                                    );
                                  }
                                  const maxBis = maxBisZeit(block.von, block.bis);
                                  return (
                                    <div key={idx}
                                      title={`Frei: ${block.von}–${block.bis} (${Math.floor(block.dauerMin / 60)}h ${block.dauerMin % 60}min)`}
                                      onClick={() => setFormular((f) => ({ ...f, von: block.von, bis: maxBis }))}
                                      style={{ width: `${block.breite}%`, backgroundColor: "var(--green)", height: "100%", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transition: "opacity 0.15s" }}
                                      onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
                                      onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}>
                                      {block.breite > 15 && <>
                                        <div style={{ fontSize: 11, color: "white", fontWeight: 600 }}>FREI — {Math.floor(block.dauerMin / 60)}h {block.dauerMin % 60 > 0 ? `${block.dauerMin % 60}min` : ""}</div>
                                      </>}
                                    </div>
                                  );
                                });
                              })()}
                            </div>

                            {/* ── Dynamische Zeitmarkierungen ───────────────────────── */}
                            <div style={{ position: "relative", height: 18, marginTop: 3, fontSize: 11, color: "var(--text-muted)" }}>
                              {(() => {
                                const tagesStart = 8 * 60;
                                const tagsDauer = 12 * 60;
                                const marken = ["08:00", ...((ausgewaehltesRaum.belegungen || []).flatMap((b) => [b.von, b.bis])), "20:00"];
                                const eindeutig = [...new Set(marken)].sort();
                                return eindeutig.map((zeit) => {
                                  const [h, m] = zeit.split(":").map(Number);
                                  const pos = ((h * 60 + m - tagesStart) / tagsDauer) * 100;
                                  return (
                                    <span key={zeit} style={{ position: "absolute", left: `${pos}%`, transform: "translateX(-50%)" }}>{zeit}</span>
                                  );
                                });
                              })()}
                            </div>

                            {/* ── Legende ──────────────────────────────────────────── */}
                            <div style={{ display: "flex", gap: 16, marginTop: 10, marginBottom: 14, fontSize: 12, color: "var(--text-muted)", alignItems: "center" }}>
                              <span><span style={{ display: "inline-block", width: 12, height: 12, backgroundColor: "var(--red)", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} />Belegt</span>
                              <span><span style={{ display: "inline-block", width: 12, height: 12, backgroundColor: "#9ca3af", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} />Zu kurz (&lt;60 min)</span>
                              <span><span style={{ display: "inline-block", width: 12, height: 12, backgroundColor: "var(--green)", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} />Frei — buchbar</span>
                            </div>

                            {/* ── Trennlinie ───────────────────────────────────────── */}
                            <hr style={{ border: "none", borderTop: "1px solid var(--border)", marginBottom: 14 }} />

                            {/* ── Belegungsliste ───────────────────────────────────── */}
                            {(ausgewaehltesRaum.belegungen || []).length > 0 && (
                              <div style={{ marginBottom: 14 }}>
                                {ausgewaehltesRaum.belegungen.map((b) => (
                                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", backgroundColor: "var(--bg)", borderRadius: "var(--radius)", marginBottom: 6, fontSize: 13 }}>
                                    <div>
                                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{b.von} – {b.bis} Uhr</div>
                                      <div style={{ color: "var(--text-secondary)" }}>{b.professor} · {b.modul}</div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        const token = sessionStorage.getItem("token");
                                        if (!token) { alert("Bitte melde dich zuerst an."); return; }
                                        fetch(`${API_URL}/api/raeume/belegen/${b.id}`, {
                                          method: "DELETE",
                                          headers: { Authorization: `Bearer ${token}` },
                                        }).then(async () => {
                                          const [hausDaten, belegungenData] = await Promise.all([
                                            fetch(`${API_URL}/api/haeuser/${ausgewaehltesHaus.id}/raeume`).then((r) => r.json()),
                                            fetch(`${API_URL}/api/raeume/`).then((r) => r.json()),
                                          ]);
                                          const belegungen = belegungenData.belegungen || [];
                                          const raeumeMitBelegungen = hausDaten.raeume.map((r) => {
                                            const raumBelegungen = belegungen.filter((b) => b.raum_id === r.id && b.haus_id === ausgewaehltesHaus.id);
                                            if (raumBelegungen.length > 0) {
                                              return { ...r, belegt: true, belegungen: raumBelegungen, belegung_id: raumBelegungen[0].id, professor: raumBelegungen[0].professor, modul: raumBelegungen[0].modul, von: raumBelegungen[0].von, bis: raumBelegungen[0].bis };
                                            }
                                            return { ...r, belegt: false, belegungen: [] };
                                          });
                                          const hausMitRaeumen = { ...ausgewaehltesHaus, raeume: raeumeMitBelegungen };
                                          setHaeuser((prev) => prev.map((h) => h.id === ausgewaehltesHaus.id ? hausMitRaeumen : h));
                                          setAusgewaehltesHaus(hausMitRaeumen);
                                          const aktualisiertesRaum = raeumeMitBelegungen.find((r) => r.id === ausgewaehltesRaum.id);
                                          setAusgewaehltesRaum(aktualisiertesRaum);
                                        });
                                      }}
                                      style={{ fontSize: 12, padding: "4px 12px", background: "var(--green)", color: "white", border: "none", borderRadius: "var(--radius)", cursor: "pointer", whiteSpace: "nowrap" }}
                                    >
                                      Raum freigeben
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* ── Neue Belegung hinzufügen ─────────────────────────── */}
                            <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                              <div style={{ flex: 1 }}>
                                <label className="login-label">Professor</label>
                                <input className="login-input" placeholder="z.B. Prof. Dr. Roschke" value={formular.professor} onChange={(e) => {
                                  // Nur Buchstaben, Leerzeichen und Punkte erlaubt
                                  const wert = e.target.value.replace(/[^a-zA-ZäöüÄÖÜß\s.]/g, "");
                                  setFormular({ ...formular, professor: wert });
                                }} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label className="login-label">Modul</label>
                                <input className="login-input" placeholder="z.B. Informatik II" value={formular.modul} onChange={(e) => {
                                  // Nur Buchstaben, Leerzeichen und Punkte erlaubt
                                  const wert = e.target.value.replace(/[^a-zA-ZäöüÄÖÜß\s.]/g, "");
                                  setFormular({ ...formular, modul: wert });
                                }} />
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                              <div style={{ flex: 1 }}>
                                <label className="login-label">Von</label>
                                <input className="login-input" placeholder="13:00" value={formular.von}
                                  style={{ border: formular.von ? "1px solid var(--green)" : undefined, color: formular.von ? "var(--green)" : undefined }}
                                  onChange={(e) => {
                                    // Nur Zahlen und Doppelpunkt erlaubt (Format: HH:MM)
                                    const wert = e.target.value.replace(/[^0-9:]/g, "");
                                    setFormular({ ...formular, von: wert });
                                  }} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label className="login-label">Bis (max 3h)</label>
                                <input className="login-input" placeholder="13:00" value={formular.bis}
                                  style={{ border: formular.bis ? "1px solid var(--green)" : undefined, color: formular.bis ? "var(--green)" : undefined }}
                                  onChange={(e) => {
                                    // Nur Zahlen und Doppelpunkt erlaubt (Format: HH:MM)
                                    const wert = e.target.value.replace(/[^0-9:]/g, "");
                                    setFormular({ ...formular, bis: wert });
                                  }} />
                              </div>
                            </div>
                            <button onClick={raumToggle} className="btn-primary"
                              style={{ background: "var(--red)", width: "100%", padding: "10px 20px" }}>
                              Raum belegen
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
