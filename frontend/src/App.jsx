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
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import NewsTicker from "./components/NewsTicker";
import Dashboard from "./pages/Dashboard";
import Mensa from "./pages/Mensa";
import MensaLegende from "./pages/MensaLegende";
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import Kontakte from "./pages/Kontakte";
import KontaktDetail from "./pages/KontaktDetail";
import Faculties from "./pages/Faculties";
import AdminLogin from "./pages/AdminLogin";
import ModuleAdd from "./pages/ModuleAdd";
import ComingSoon from "./pages/ComingSoon";
// [MERGE: Claude] Fabian's Raumfinder-Seite hinzugefügt
import Raumfinder from "./pages/Raumfinder";
// [MERGE] Aris Admin-Dashboard
import AdminDashboard from "./pages/AdminDashboard";
import { fetchExtraModules, persistExtraModule, deleteExtraModule, reorderExtraModules } from "./api/modules";
import "./index.css";

// [MERGE: Claude] /raumfinder zu STATIC_PATHS hinzugefügt
const STATIC_PATHS = new Set(["/", "/mensa", "/news", "/kontakt", "/raumfinder", "/fakultaeten"]);

const CORE_MODULES = [
  {
    id: "hochschule",
    label: "Hochschule",
    icon: "",
    path: "/",
    tag: "",
    description: "Startseite des Campus-Portals der HS Mittweida.",
    color: "#3b82f6",
    banner: "",
    sections: [],
    links: [],
    active: true,
  },
  {
    id: "news",
    label: "Neuigkeiten",
    icon: "",
    path: "/news",
    tag: "",
    description: "Aktuelle Meldungen rund um die Hochschule.",
    color: "#3b82f6",
    banner: "",
    sections: [],
    links: [],
    active: true,
  },
  {
    id: "fakultaeten",
    label: "Fakultäten",
    icon: "",
    path: "/fakultaeten",
    tag: "",
    description: "Überblick über die Fakultäten und Institute der HSMW.",
    color: "#3b82f6",
    banner: "",
    sections: [],
    links: [],
    active: true,
  },
  {
    id: "raumfinder",
    label: "Raumfinder",
    icon: "",
    path: "/raumfinder",
    tag: "",
    description: "Übersicht aller Räume und Hörsäle auf dem Campus inkl. Belegung.",
    color: "#3b82f6",
    banner: "",
    sections: [],
    links: [],
    active: true,
  },
  {
    id: "mensa",
    label: "Mensa",
    icon: "",
    path: "/mensa",
    tag: "",
    description: "Speiseplan der HSMW-Mensa.",
    color: "#3b82f6",
    banner: "",
    sections: [],
    links: [],
    active: true,
  },
  {
    id: "kontakt",
    label: "Kontakte",
    icon: "",
    path: "/kontakt",
    tag: "",
    description: "Mitarbeiter-Verzeichnis der HSMW mit Suche, Foto, E-Mail und Durchwahl.",
    color: "#3b82f6",
    banner: "",
    sections: [],
    links: [],
    active: true,
  },
];

// [FIX Claude] Reihenfolge kommt jetzt aus der persistierten Modul-Liste
// (vom Backend, per Sortieren steuerbar). Kernmodule liefern nur noch die
// Standardwerte (Label/Pfad/Farbe) als Fallback. Dadurch wirkt das Sortieren
// in der Modul-Verwaltung wirklich – auch für die Kernmodule.
function withCoreModules(modules) {
  const coreById = new Map(CORE_MODULES.map((mod) => [mod.id, mod]));
  const result = [];
  const seen = new Set();
  // 1) Persistierte Module in gespeicherter Reihenfolge (das Sortieren steuert das)
  modules
    .filter((mod) => mod.active !== false)
    .forEach((mod) => {
      const base = coreById.get(mod.id) || {};
      result.push({ ...base, ...mod, active: mod.active !== false });
      seen.add(mod.id);
    });
  // 2) Kernmodule, die (noch) nicht gespeichert sind, hinten in Standard-Reihenfolge anhängen
  CORE_MODULES.forEach((mod) => {
    if (!seen.has(mod.id)) result.push(mod);
  });
  return result;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}

// [MERGE] Token gültig? (vorhanden UND nicht abgelaufen). Demo-Token zählt als gültig.
function tokenGueltig() {
  let t = null;
  try { t = sessionStorage.getItem("token"); } catch { return false; }
  if (!t) return false;
  if (t === "demo-token") return true;
  try {
    const teil = t.split(".")[1];
    if (!teil) return true;
    const payload = JSON.parse(atob(teil.replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp * 1000 <= Date.now()) return false;
    return true;
  } catch { return true; }
}

// [MERGE] Schützt Routen: ohne gültigen Token → weiter zum Login.
function RequireAdmin({ children }) {
  return tokenGueltig() ? children : <Navigate to="/admin" replace />;
}

function AppInner() {
  const [extraModules, setExtraModules] = useState([]);
  const [modulesLoaded, setLoaded]      = useState(false);
  const [isAdmin, setIsAdmin]           = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const location = useLocation();
  const navigate = useNavigate();

  // Theme bei jeder Änderung auf <html> setzen und in localStorage speichern
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Admin-Status prüfen (Token vorhanden & nicht abgelaufen). Abgelaufenen Token
  // entfernen, damit die Admin-Buttons verschwinden statt zum Login zu leiten.
  useEffect(() => {
    const pruefe = () => {
      const ok = tokenGueltig();
      if (!ok) {
        try { sessionStorage.removeItem("token"); sessionStorage.removeItem("token_type"); } catch { /* noop */ }
      }
      setIsAdmin(ok);
    };
    pruefe();
    const iv = setInterval(pruefe, 30000);        // regelmäßig nachprüfen
    window.addEventListener("focus", pruefe);     // beim Zurückwechseln zum Tab
    return () => { clearInterval(iv); window.removeEventListener("focus", pruefe); };
  }, [location.pathname]);

  // [MERGE] Logout: Token löschen, Admin-Status zurücksetzen, zur Startseite.
  const handleLogout = () => {
    try { sessionStorage.removeItem("token"); sessionStorage.removeItem("token_type"); } catch { /* noop */ }
    setIsAdmin(false);
    navigate("/");
  };

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
 
  // Modul hinzufügen ODER ein archiviertes wieder aktivieren (active:true)
  const addModule = async (mod) => {
    const aktiv = { ...mod, active: mod.active !== false };  // neu erstellte Module können inaktiv sein
    setExtraModules((prev) => [...prev.filter((m) => m.id !== aktiv.id), aktiv]);
    try {
      await persistExtraModule(aktiv);
    } catch (err) {
      console.error("Modul konnte nicht gespeichert werden:", err);
      alert("Speichern fehlgeschlagen – läuft das Backend?");
    }
  };

  // [MERGE] Entfernen = ARCHIVIEREN (active:false). Inhalt bleibt erhalten,
  // Modul verschwindet aus Navigation/Startseite, taucht unten zum Reaktivieren auf.
  const removeModule = async (id) => {
    const sicherung = extraModules;
    const ziel = extraModules.find((m) => m.id === id);
    if (!ziel) return;
    const archiviert = { ...ziel, active: false };
    setExtraModules((prev) => prev.map((m) => (m.id === id ? archiviert : m)));
    try {
      await persistExtraModule(archiviert);
    } catch (err) {
      console.error("Modul konnte nicht archiviert werden:", err);
      setExtraModules(sicherung);
      alert("Entfernen fehlgeschlagen – läuft das Backend?");
    }
  };

  // [MERGE] Endgültig löschen (aus dem Archiv unten) – entfernt das Modul ganz.
  const deleteModule = async (id) => {
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

  // ── ARI: Reihenfolge der Zusatz-Module ändern (Admin) ──
  const reorderModules = async (ids) => {
    try {
      const res = await reorderExtraModules(ids);
      if (res && Array.isArray(res.modules)) setExtraModules(res.modules);
    } catch (err) {
      console.error("Sortieren fehlgeschlagen:", err);
      alert("Sortieren fehlgeschlagen – läuft das Backend?");
    }
  };

  // [MERGE] Aktive Module (Navigation/Startseite/Verwaltung) vs. archivierte
  const allModules = withCoreModules(extraModules);
  const archivedModules = extraModules.filter((m) => m.active === false);

  return (
      <div className="app-shell">
        <NewsTicker />
        <Navbar modules={allModules} isAdmin={isAdmin} theme={theme} onToggleTheme={toggleTheme} onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard modules={allModules} loaded={modulesLoaded} onRemove={removeModule} />} />
            <Route path="/mensa"         element={<Mensa />} />
            <Route path="/mensa/legende" element={<MensaLegende />} />
            <Route path="/news"          element={<News />} />
            <Route path="/news/:newsId"  element={<NewsDetail />} />
            <Route path="/fakultaeten"    element={<Faculties />} />
            <Route path="/kontakt"                element={<Kontakte />} />
            <Route path="/kontakt/:nutzerkuerzel" element={<KontaktDetail />} />
            <Route path="/admin"         element={<AdminLogin />} />
            <Route path="/module-add"    element={<RequireAdmin><ModuleAdd onAdd={addModule} onRemove={removeModule} onReorder={reorderModules} existing={allModules} manageItems={allModules} archived={archivedModules} onDelete={deleteModule} /></RequireAdmin>} />
            {/* [MERGE: Claude] Fabian's Raumfinder-Route ─────────────── */}
            <Route path="/raumfinder"    element={<Raumfinder />} />
            {/* [MERGE] Aris Admin-Dashboard-Route */}
            <Route path="/admin/dashboard" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />

            {extraModules
              .filter((mod) => !STATIC_PATHS.has(mod.path))
              .map((mod) => (
                <Route key={mod.id} path={mod.path} element={<ComingSoon module={mod} />} />
              ))}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <footer className="uchicago-footer" aria-label="Seitenabschluss">
          <div className="uchicago-footer-inner">
            <div className="uchicago-footer-brand">
              <span>Hochschule Mittweida</span>
              <strong>bttrhsmw</strong>
            </div>

            <nav className="uchicago-footer-links" aria-label="Fußnavigation">
              <a href="https://www.hs-mittweida.de/">Hochschule</a>
              <a href="https://www.hs-mittweida.de/newsampservice/kontakt/">Kontakt</a>
              <a href="https://www.hs-mittweida.de/impressum/">Impressum</a>
              <a href="https://www.hs-mittweida.de/datenschutz/">Datenschutz</a>
            </nav>

            <div className="uchicago-footer-meta">
              Einführung in die Informatik 2 Gruppe 5 Campus Informations Portal
              <br />
              Version 1.0.0 Final
            </div>
          </div>
        </footer>
      </div>
  );
}
