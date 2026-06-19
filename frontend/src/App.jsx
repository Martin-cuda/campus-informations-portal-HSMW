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
// [MERGE] Aris Admin-Dashboard
import AdminDashboard from "./pages/AdminDashboard";
import { fetchExtraModules, persistExtraModule, deleteExtraModule, reorderExtraModules } from "./api/modules";
import "./index.css";

// [MERGE: Claude] /raumfinder zu STATIC_PATHS hinzugefügt
const STATIC_PATHS = new Set(["/mensa", "/news", "/kontakt", "/raumfinder"]);

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
  const allModules = extraModules.filter((m) => m.active !== false);
  const archivedModules = extraModules.filter((m) => m.active === false);

  return (
      <div className="app-shell">
        <Navbar modules={allModules} isAdmin={isAdmin} theme={theme} onToggleTheme={toggleTheme} onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard modules={allModules} loaded={modulesLoaded} onRemove={removeModule} />} />
            <Route path="/mensa"         element={<Mensa />} />
            <Route path="/mensa/legende" element={<MensaLegende />} />
            <Route path="/news"          element={<News />} />
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
      </div>
  );
}
