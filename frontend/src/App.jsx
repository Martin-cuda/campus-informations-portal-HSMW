// ── ARI (ORIGINAL – Basis) + FABIAN (Raumfinder-Route) ──────────────────
//
// [MERGE: Claude] Ari's App.jsx als vollständige Basis. Änderungen:
//   1. Import von Fabian's Raumfinder-Seite hinzugefügt
//   2. Route /raumfinder hinzugefügt
//   3. Raumfinder zu STATIC_PATHS hinzugefügt (damit Coming-Soon ihn nicht
//      überschreibt falls jemand "raumfinder" als Modul-ID aktiviert)
//   Alle anderen Inhalte sind 1:1 Ari's Original (inkl. aller Kommentare).
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Mensa from "./pages/Mensa";
import MensaLegende from "./pages/MensaLegende";
import News from "./pages/News";
import Kontakte from "./pages/Kontakte";
import KontaktDetail from "./pages/KontaktDetail";
import AdminLogin from "./pages/AdminLogin";
import ModuleAdd from "./pages/ModuleAdd";
import ComingSoon from "./pages/ComingSoon";
// [MERGE: Claude] Fabian's Raumfinder-Seite hinzugefügt
import Raumfinder from "./pages/Raumfinder";
import { fetchExtraModules, persistExtraModule, deleteExtraModule } from "./api/modules";
import "./index.css";

// [MERGE: Claude] /raumfinder zu STATIC_PATHS hinzugefügt
const STATIC_PATHS = new Set(["/mensa", "/news", "/kontakt", "/raumfinder"]);

export default function App() {
  const [extraModules, setExtraModules] = useState([]);
  const [modulesLoaded, setLoaded]      = useState(false);

  useEffect(() => {
    let abgebrochen = false;
    fetchExtraModules()
      .then((mods) => {
        if (!abgebrochen) { setExtraModules(mods); setLoaded(true); }
      })
      .catch((err) => {
        console.warn("Module konnten nicht geladen werden:", err);
        if (!abgebrochen) setLoaded(true);
      });
    return () => { abgebrochen = true; };
  }, []);

  const addModule = async (mod) => {
    setExtraModules((prev) =>
      prev.some((m) => m.id === mod.id) ? prev : [...prev, mod]
    );
    try {
      await persistExtraModule(mod);
    } catch (err) {
      console.error("Modul konnte nicht gespeichert werden:", err);
      setExtraModules((prev) => prev.filter((m) => m.id !== mod.id));
      alert("Speichern fehlgeschlagen – läuft das Backend?");
    }
  };

  const removeModule = async (id) => {
    const sicherung = extraModules;
    setExtraModules((prev) => prev.filter((m) => m.id !== id));
    try {
      await deleteExtraModule(id);
    } catch (err) {
      console.error("Modul konnte nicht gelöscht werden:", err);
      setExtraModules(sicherung);
      alert("Löschen fehlgeschlagen – läuft das Backend?");
    }
  };

  const baseModules = [
    { id: "mensa", label: "Mensa", icon: "", path: "/mensa" },
    { id: "news",  label: "News",  icon: "", path: "/news"  },
  ];

  const allModules = [...baseModules, ...extraModules];

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar modules={allModules} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard modules={allModules} loaded={modulesLoaded} onRemove={removeModule} />} />
            <Route path="/mensa"         element={<Mensa />} />
            <Route path="/mensa/legende" element={<MensaLegende />} />
            <Route path="/news"          element={<News />} />
            <Route path="/kontakt"                element={<Kontakte />} />
            <Route path="/kontakt/:nutzerkuerzel" element={<KontaktDetail />} />
            <Route path="/admin"         element={<AdminLogin />} />
            <Route path="/module-add"    element={<ModuleAdd onAdd={addModule} existing={allModules} />} />
            {/* [MERGE: Claude] Fabian's Raumfinder-Route ─────────────── */}
            <Route path="/raumfinder"    element={<Raumfinder />} />

            {extraModules
              .filter((mod) => !STATIC_PATHS.has(mod.path))
              .map((mod) => (
                <Route key={mod.id} path={mod.path} element={<ComingSoon module={mod} />} />
              ))}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
