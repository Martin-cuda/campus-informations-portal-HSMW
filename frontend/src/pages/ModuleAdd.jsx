// ──────────────────────────────────────────────────────────────────────────
// ModuleAdd.jsx
// Seite zum Aktivieren bzw. Bearbeiten von Modulen.
// Zwei Modi:
//   1) Erstellen: Auswahl aus vorgefertigten Modulen oder Inline-Formular
//      für ein eigenes Modul (Name, Icon, Beschreibung, Akzentfarbe, Banner,
//      Inhalts-Abschnitte, externe Links).
//   2) Bearbeiten: wenn /module-add mit { state: { editingModule } } aufgerufen
//      wird, vorgefülltes Formular für ein bestehendes eigenes Modul.
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
// useLocation gibt uns den Router-State (für den Edit-Modus),
// useNavigate ermöglicht das Springen zur Dashboard-Seite nach dem Speichern.
import { useLocation, useNavigate } from "react-router-dom";

// Vorgefertigte Module die per Klick ohne Formular aktiviert werden können.
// Jeder Eintrag entspricht später einem Modul-Objekt im Backend.
const AVAILABLE_MODULES = [
  { id: "mensa",      label: "Mensa",      icon: "", path: "/mensa",      tag: "",
    description: "Speiseplan der HSMW-Mensa." },
  { id: "news",       label: "News",       icon: "", path: "/news",       tag: "",
    description: "Aktuelle Meldungen rund um die Hochschule." },
  { id: "raumfinder", label: "Raumfinder", icon: "", path: "/raumfinder", tag: "",
    description: "Übersicht aller Räume und Hörsäle auf dem Campus inkl. Belegung." },
  { id: "kontakt",    label: "Kontakte",   icon: "", path: "/kontakt",    tag: "",
    description: "Mitarbeiter-Verzeichnis der HSMW mit Suche, Foto, E-Mail und Durchwahl." },
];

// Auswahl an Akzentfarben fürs eigene Modul. Werden als runde Swatch-Buttons
// gezeigt, der Hex-Code wird mit dem Modul-Objekt gespeichert.
const FARB_OPTIONEN = [
  { value: "#3b82f6", label: "Blau" },
  { value: "#22c55e", label: "Grün" },
  { value: "#f59e0b", label: "Orange" },
  { value: "#ef4444", label: "Rot" },
  { value: "#8b5cf6", label: "Lila" },
  { value: "#0ea5e9", label: "Türkis" },
];

// Aus einem freien Namen einen URL-tauglichen Slug machen.
// "Sport-Anmeldung" → "sport-anmeldung", "Café Süd" → "cafe-sued", "ÄÖÜ ß" → "aeoeue-ss"
function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    // Umlaute und ß zu ASCII transliterieren
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    // Alles was nicht Buchstabe/Ziffer ist mit Bindestrich ersetzen
    .replace(/[^a-z0-9]+/g, "-")
    // Bindestriche am Anfang und Ende abschneiden
    .replace(/(^-|-$)/g, "");
}

// Hauptkomponente
// onAdd      = wird mit dem fertigen Modul-Objekt aufgerufen, persistiert es im Backend
// existing   = aktuelle Liste der schon aktiven Module (für Duplikat-Check)
export default function ModuleAdd({ onAdd, existing, onRemove, onReorder, manageItems = [], archived = [], onDelete }) {
  // Welche der vorgefertigten Modul-Kacheln gerade markiert ist
  const [selected, setSelected] = useState(null);
  // Ob das Inline-Formular für eigenes Modul gerade ausgeklappt ist
  const [showForm, setShowForm] = useState(false);

  // Custom-Module-Form – Grunddaten
  const [customName, setCustomName] = useState("");
  const [customIcon, setCustomIcon] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customColor, setColor]     = useState(FARB_OPTIONEN[0].value);

  // Custom-Module-Form – reichhaltiger Inhalt
  const [customBanner, setBanner]   = useState("");
  // Mindestens ein leeres Section-Objekt damit das Formular eine Eingabezeile zeigt
  const [sections, setSections]     = useState([{ title: "", body: "" }]);
  const [links, setLinks]           = useState([{ label: "", url: "" }]);

  // Fehlertext der über dem Submit-Button angezeigt wird
  const [formError, setFormError]   = useState("");
  const [formOk, setFormOk]         = useState(""); // [MERGE] Erfolgsmeldung

  const navigate = useNavigate();
  const location = useLocation();

  // Wenn /module-add mit { state: { editingModule } } aufgerufen wird, sind wir
  // im Bearbeiten-Modus. Dann werden id und path nicht aus dem Namen abgeleitet,
  // sondern bleiben stabil (siehe handleCreateCustom unten).
  const editingModule = location.state?.editingModule || null;
  // [MERGE] Bearbeiten kann auch direkt hier aus der Liste gestartet werden (nicht nur per Router-State)
  const [editing, setEditing] = useState(editingModule);
  const startEdit = (mod) => {
    setFormOk("");
    setEditing(mod);
    setSelected(null);
    setShowForm(true);
    setCustomName(mod.label || "");
    setCustomIcon(mod.icon || "");
    setCustomDesc(mod.description || "");
    setColor(mod.color || FARB_OPTIONEN[0].value);
    setBanner(mod.banner || "");
    setSections(mod.sections?.length ? mod.sections : [{ title: "", body: "" }]);
    setLinks(mod.links?.length ? mod.links : [{ label: "", url: "" }]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Beim Mount das Formular vorfüllen wenn wir im Edit-Modus sind.
  // Die Dependencies-Liste ist mit Absicht leer: location.state nur einmal
  // beim Mount auswerten; späteres Re-Rendern soll das Formular nicht überschreiben.
  useEffect(() => {
    if (editingModule) {
      setShowForm(true);
      setSelected(null);
      setCustomName(editingModule.label || "");
      setCustomIcon(editingModule.icon || "");
      setCustomDesc(editingModule.description || "");
      setColor(editingModule.color || FARB_OPTIONEN[0].value);
      setBanner(editingModule.banner || "");
      setSections(editingModule.sections?.length
        ? editingModule.sections
        : [{ title: "", body: "" }]);
      setLinks(editingModule.links?.length
        ? editingModule.links
        : [{ label: "", url: "" }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Liste der schon vergebenen IDs – für Duplikat-Check
  const existingIds = existing.map((m) => m.id);

  // Klick auf eine vorgefertigte Modul-Kachel.
  // Wenn schon aktiv, ignorieren. Sonst markieren / entmarkieren.
  const toggle = (mod) => {
    if (existingIds.includes(mod.id)) return;
    setShowForm(false);
    setSelected((prev) => (prev?.id === mod.id ? null : mod));
  };

  // "+"-Tile geklickt → Inline-Formular für eigenes Modul aufklappen
  const openForm = () => {
    setSelected(null);
    setShowForm(true);
    setFormError("");
    setFormOk("");
  };

  // "Abbrechen" im Formular: im Edit-Modus zurück zum Dashboard,
  // im Erstell-Modus nur das Formular zuklappen
  const closeForm = () => {
    setEditing(null);
    setShowForm(false);
    setFormError("");
  };

  // Helfer für die Sections-Liste
  const addSection = () => setSections((s) => [...s, { title: "", body: "" }]);
  const removeSection = (i) => setSections((s) => s.filter((_, idx) => idx !== i));
  const updateSection = (i, key, val) =>
    setSections((s) => s.map((sec, idx) => (idx === i ? { ...sec, [key]: val } : sec)));

  // Helfer für die Links-Liste
  const addLink = () => setLinks((l) => [...l, { label: "", url: "" }]);
  const removeLink = (i) => setLinks((l) => l.filter((_, idx) => idx !== i));
  const updateLink = (i, key, val) =>
    setLinks((l) => l.map((lk, idx) => (idx === i ? { ...lk, [key]: val } : lk)));

  // Klick auf "Modul aktivieren" für eines der vorgefertigten Module
  const handleAdd = () => {
    if (!selected) return;
    onAdd({ ...selected, active: true });   // ausgewähltes/archiviertes Modul aktivieren
    navigate("/");
  };

  // Klick auf "Modul erstellen" / "Änderungen speichern" im Custom-Formular
  const handleCreateCustom = () => {
    const name = customName.trim();
    if (!name) {
      setFormError("Bitte einen Namen eingeben.");
      return;
    }

    // ID und Pfad bestimmen: im Edit-Modus aus dem alten Modul übernehmen,
    // sonst aus dem Namen einen Slug bauen.
    let id, path;
    if (editing) {
      id   = editing.id;
      path = editing.path;
    } else {
      const slug = slugify(name);
      if (!slug) {
        setFormError("Der Name enthält keine gültigen Zeichen.");
        return;
      }
      id   = `custom-${slug}`;
      path = `/${slug}`;
      if (existingIds.includes(id)) {
        setFormError("Ein Modul mit diesem Namen ist schon aktiv.");
        return;
      }
    }

    // Leere Abschnitte/Links rausfiltern bevor wir speichern
    const cleanSections = sections.filter((s) => s.title.trim() || s.body.trim());
    const cleanLinks    = links.filter((l) => l.url.trim() && l.label.trim());

    // Fertiges Modul-Objekt an App.jsx weitergeben (das ruft persistExtraModule)
    const istEdit = !!editing;
    onAdd({
      id,
      label: name,
      icon: customIcon.trim() || "",
      path,
      tag: "Eigenes Modul",
      description: customDesc.trim(),
      color: customColor,
      banner: customBanner.trim(),
      sections: cleanSections,
      links: cleanLinks,
      // [MERGE] Neu erstellte Module bleiben INAKTIV (landen unten, kein Auto-Freischalten).
      // Beim Bearbeiten den bisherigen Status behalten.
      active: istEdit ? (editing.active !== false) : false,
    });
    // [MERGE] Auf der Seite bleiben statt zum Dashboard zu springen.
    setEditing(null);
    setShowForm(false);
    setSelected(null);
    setCustomName(""); setCustomIcon(""); setCustomDesc("");
    setColor(FARB_OPTIONEN[0].value); setBanner("");
    setSections([{ title: "", body: "" }]); setLinks([{ label: "", url: "" }]);
    setFormError("");
    setFormOk(istEdit
      ? `"${name}" wurde gespeichert.`
      : `"${name}" wurde erstellt und liegt unten bereit – zum Aktivieren anklicken.`);
  };

  // True wenn wir aktuell ein bestehendes Modul bearbeiten
  const istEditMode = !!editing;

  // ── [MERGE] Admin: Modul in der Reihenfolge verschieben ──
  const moveItem = (index, dir) => {
    if (!onReorder) return;
    const ids = manageItems.map((m) => m.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    onReorder(ids);
  };

  return (
    <div>
      {/* Header oben passt sich an Modus an */}
      <div className="page-header fade-up">
        <div className="page-title">
          {istEditMode ? "Modul bearbeiten" : "Module verwalten"}
        </div>
        <div className="page-subtitle">
          {istEditMode
            ? `Du bearbeitest "${editing.label}" – Änderungen wirken für alle User`
            : "Module sortieren, entfernen oder ein neues hinzufügen"}
        </div>
      </div>

      {formOk && (
        <div className="card fade-up" style={{ marginBottom: 16, borderLeft: "4px solid #22c55e", color: "var(--text-primary)" }}>
          {formOk}
        </div>
      )}
      {/* ── [MERGE] Admin: aktive Module verwalten (sortieren/entfernen) ── */}
      {manageItems.length > 0 && (onReorder || onRemove) && (
        <div className="card fade-up" style={{ marginBottom: 16 }}>
          <h2 className="page-title" style={{ marginTop: 0, fontSize: "1.15rem" }}>Aktive Module</h2>
          <p className="page-subtitle" style={{ marginBottom: 16 }}>
            Reihenfolge per Pfeil ändern oder Modul entfernen – gilt für Navigation und Startseite.
          </p>
          <div className="manage-grid">
            {manageItems.map((mod, i) => (
              <div key={mod.id} className="manage-card">
                <span className="manage-num">{i + 1}</span>
                <span className="manage-label">{mod.label}</span>
                <div className="manage-actions">
                  {String(mod.id).startsWith("custom-") && (
                    <button type="button" className="manage-btn" onClick={() => startEdit(mod)} title="Bearbeiten" aria-label="Bearbeiten">✎</button>
                  )}
                  <button type="button" className="manage-btn" disabled={i === 0}
                    onClick={() => moveItem(i, -1)} title="Nach oben" aria-label="Nach oben">▲</button>
                  <button type="button" className="manage-btn" disabled={i === manageItems.length - 1}
                    onClick={() => moveItem(i, 1)} title="Nach unten" aria-label="Nach unten">▼</button>
                  {onRemove && (
                    <button type="button" className="manage-btn manage-btn-danger"
                      onClick={() => onRemove(mod.id)} title="Entfernen" aria-label="Entfernen">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card fade-up">
        {/* Auswahlraster nur im Erstellen-Modus zeigen */}
        {!istEditMode && (
          <div className="module-grid">
            {AVAILABLE_MODULES.map((mod) => {
              const isExisting = existingIds.includes(mod.id);
              const isSelected = selected?.id === mod.id;
              return (
                <div
                  key={mod.id}
                  className={`module-option ${isSelected ? "selected" : ""} ${isExisting ? "disabled" : ""}`}
                  onClick={() => toggle(mod)}
                  title={mod.description}
                >
                  <div className="module-option-icon">{mod.icon}</div>
                  <div className="module-option-name">{mod.label}</div>
                  <div className="module-option-tag">
                    {isExisting ? "Bereits aktiv" : mod.tag}
                  </div>
                </div>
              );
            })}

            {/* [MERGE] Archivierte eigene Module – klick zum Reaktivieren (Inhalt bleibt erhalten) */}
            {archived.filter((m) => String(m.id).startsWith("custom-")).map((mod) => {
              const isSelected = selected?.id === mod.id;
              return (
                <div
                  key={mod.id}
                  className={`module-option ${isSelected ? "selected" : ""}`}
                  onClick={() => toggle(mod)}
                  title={`Inaktiv – klick zum Aktivieren${mod.description ? ": " + mod.description : ""}`}
                >
                  <div className="module-option-icon">{mod.icon}</div>
                  <div className="module-option-name">{mod.label}</div>
                  <div className="module-option-tag">Inaktiv</div>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`"${mod.label}" endgültig löschen? Inhalt geht verloren.`)) onDelete(mod.id);
                      }}
                      title="Endgültig löschen"
                      style={{ marginTop: 10, fontSize: 12, color: "#ef4444", background: "transparent", border: "1px solid #ef4444", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}
                    >
                      Löschen
                    </button>
                  )}
                </div>
              );
            })}

            {/* "+"-Tile am Ende des Rasters: eigenes Modul erstellen */}
            <div
              className={`module-option module-option-add ${showForm ? "selected" : ""}`}
              onClick={openForm}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openForm(); }}
            >
              <div className="module-option-icon">+</div>
              <div className="module-option-name">Eigenes Modul</div>
              <div className="module-option-tag">Neu erstellen</div>
            </div>
          </div>
        )}

        {/* Beschreibung des aktuell ausgewählten vorgefertigten Moduls */}
        {selected && !showForm && selected.description && (
          <div
            className="fade-up"
            style={{
              marginTop: 18,
              padding: "12px 16px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 8,
              color: "#1e3a8a",
              fontSize: 13,
            }}
          >
            <strong>{selected.label}:</strong> {selected.description}
          </div>
        )}

        {/* Inline-Formular für eigenes Modul (Erstellen oder Bearbeiten) */}
        {showForm && (
          <div className="custom-module-form fade-up">
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 14 }}>
              {istEditMode ? "Modul bearbeiten" : "Eigenes Modul erstellen"}
            </div>

            <label className="login-label">Name *</label>
            <input
              className="login-input"
              type="text"
              placeholder="z.B. Sport-Anmeldung"
              value={customName}
              onChange={(e) => { setCustomName(e.target.value); setFormError(""); }}
              autoFocus
              maxLength={40}
            />
            {/* Hinweis dass URL stabil bleibt – wichtig für User-Vertrauen */}
            {istEditMode && (
              <div style={{ marginTop: -12, marginBottom: 16, fontSize: 11, color: "#94a3b8" }}>
                URL-Pfad bleibt unverändert: <code>{editing?.path}</code>
              </div>
            )}

            <label className="login-label">Icon (Emoji, optional)</label>
            <input
              className="login-input"
              type="text"
              placeholder=""
              value={customIcon}
              onChange={(e) => setCustomIcon(e.target.value)}
              maxLength={4}
            />

            <label className="login-label">Kurzbeschreibung (optional, max 300 Zeichen)</label>
            <textarea
              className="login-input"
              rows={2}
              placeholder="Worum geht's bei dem Modul in einem Satz?"
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              maxLength={300}
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />

            <label className="login-label">Akzentfarbe</label>
            <div className="color-row">
              {FARB_OPTIONEN.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={"color-swatch" + (customColor === f.value ? " active" : "")}
                  style={{ background: f.value }}
                  onClick={() => setColor(f.value)}
                  aria-label={f.label}
                  title={f.label}
                />
              ))}
            </div>

            <label className="login-label">Banner-Bild (URL, optional)</label>
            <input
              className="login-input"
              type="url"
              placeholder="https://..."
              value={customBanner}
              onChange={(e) => setBanner(e.target.value)}
            />

            {/* Inhalts-Abschnitte: beliebig viele Title+Body-Paare */}
            <div className="builder-block">
              <div className="builder-head">
                <div className="builder-title">Inhalts-Abschnitte</div>
                <button type="button" className="builder-add" onClick={addSection}>
                  + Abschnitt
                </button>
              </div>
              {sections.map((sec, i) => (
                <div key={i} className="builder-item">
                  <div className="builder-item-head">
                    <span className="builder-item-num">#{i + 1}</span>
                    {/* Entfernen-Button erscheint nur wenn mindestens 2 Abschnitte da sind,
                        sonst hat der User irgendwann einen leeren Builder ohne Eingabefeld */}
                    {sections.length > 1 && (
                      <button type="button" className="builder-remove" onClick={() => removeSection(i)} title="Abschnitt entfernen">
                        ×
                      </button>
                    )}
                  </div>
                  <input
                    className="login-input"
                    type="text"
                    placeholder="Titel (optional)"
                    value={sec.title}
                    onChange={(e) => updateSection(i, "title", e.target.value)}
                    maxLength={80}
                  />
                  <textarea
                    className="login-input"
                    rows={3}
                    placeholder="Text-Inhalt des Abschnitts"
                    value={sec.body}
                    onChange={(e) => updateSection(i, "body", e.target.value)}
                    style={{ resize: "vertical", fontFamily: "inherit" }}
                    maxLength={2000}
                  />
                </div>
              ))}
            </div>

            {/* Externe Links: Label-URL-Paare */}
            <div className="builder-block">
              <div className="builder-head">
                <div className="builder-title">Externe Links</div>
                <button type="button" className="builder-add" onClick={addLink}>
                  + Link
                </button>
              </div>
              {links.map((lk, i) => (
                <div key={i} className="builder-item">
                  <div className="builder-item-head">
                    <span className="builder-item-num">#{i + 1}</span>
                    {links.length > 1 && (
                      <button type="button" className="builder-remove" onClick={() => removeLink(i)} title="Link entfernen">
                        ×
                      </button>
                    )}
                  </div>
                  <input
                    className="login-input"
                    type="text"
                    placeholder="Anzeigename z.B. „Anmeldung"
                    value={lk.label}
                    onChange={(e) => updateLink(i, "label", e.target.value)}
                    maxLength={60}
                  />
                  <input
                    className="login-input"
                    type="url"
                    placeholder="https://..."
                    value={lk.url}
                    onChange={(e) => updateLink(i, "url", e.target.value)}
                  />
                </div>
              ))}
            </div>

            {/* Live-Vorschau: aktualisiert sich bei jedem Tastendruck */}
            <div className="builder-block">
              <div className="builder-title" style={{ marginBottom: 8 }}>Vorschau</div>
              <div className="custom-preview" style={{ borderTop: `3px solid ${customColor}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 22 }}>{customIcon.trim() || ""}</div>
                  <div style={{ fontWeight: 600, color: customColor, fontSize: 16 }}>
                    {customName.trim() || "Mein Modul"}
                  </div>
                </div>
                {customDesc.trim() && (
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{customDesc}</div>
                )}
                {sections.filter((s) => s.title.trim() || s.body.trim()).length > 0 && (
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {sections.filter((s) => s.title.trim() || s.body.trim()).length} Abschnitt(e)
                  </div>
                )}
                {links.filter((l) => l.url.trim() && l.label.trim()).length > 0 && (
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {links.filter((l) => l.url.trim() && l.label.trim()).length} externe Link(s)
                  </div>
                )}
              </div>
            </div>

            {formError && <div className="login-error" style={{ textAlign: "left" }}>{formError}</div>}

            <div className="btn-row">
              <button className="btn-primary" style={{ width: "auto", padding: "10px 28px" }} onClick={handleCreateCustom}>
                {istEditMode ? "Änderungen speichern" : "Modul erstellen"}
              </button>
              <button className="btn-secondary" onClick={closeForm}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* Standard-Buttons fürs vorgefertigte Modul (nur Erstellen-Modus) */}
        {!showForm && !istEditMode && (
          <div className="btn-row">
            <button
              className="btn-primary"
              style={{ width: "auto", padding: "10px 28px", opacity: selected ? 1 : 0.5 }}
              onClick={handleAdd}
              disabled={!selected}
            >
              Modul aktivieren
            </button>
            <button className="btn-secondary" onClick={() => navigate("/")}>
              Abbrechen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
