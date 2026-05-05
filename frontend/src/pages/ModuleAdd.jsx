import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AVAILABLE_MODULES = [
  { id: "stundenplan", label: "Stundenplan", icon: "📅", path: "/stundenplan", tag: "Neu" },
  { id: "raumplan",    label: "Raumplan",    icon: "🗺", path: "/raumplan",    tag: "Neu" },
  { id: "events",      label: "Events",      icon: "🎉", path: "/events",      tag: "Neu" },
  { id: "bibliothek",  label: "Bibliothek",  icon: "📚", path: "/bibliothek",  tag: "Neu" },
  { id: "kontakt",     label: "Kontakt",     icon: "📞", path: "/kontakt",     tag: "Neu" },
  { id: "prüfungen",   label: "Prüfungen",   icon: "📝", path: "/pruefungen",  tag: "Neu" },
];

export default function ModuleAdd({ onAdd, existing }) {
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  const existingIds = existing.map((m) => m.id);

  const toggle = (mod) => {
    if (existingIds.includes(mod.id)) return;
    setSelected((prev) => (prev?.id === mod.id ? null : mod));
  };

  const handleAdd = () => {
    if (!selected) return;
    onAdd(selected);
    navigate("/");
  };

  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">➕ Modul hinzufügen</div>
        <div className="page-subtitle">Wähle ein Modul aus um es zum Dashboard hinzuzufügen</div>
      </div>

      <div className="card fade-up">
        <div className="module-grid">
          {AVAILABLE_MODULES.map((mod) => {
            const isExisting = existingIds.includes(mod.id);
            const isSelected = selected?.id === mod.id;
            return (
              <div
                key={mod.id}
                className={`module-option ${isSelected ? "selected" : ""} ${isExisting ? "disabled" : ""}`}
                onClick={() => toggle(mod)}
              >
                <div className="module-option-icon">{mod.icon}</div>
                <div className="module-option-name">{mod.label}</div>
                <div className="module-option-tag">
                  {isExisting ? "Bereits aktiv" : mod.tag}
                </div>
              </div>
            );
          })}
        </div>

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
      </div>
    </div>
  );
}
