import { NavLink, Link } from "react-router-dom";

export default function Navbar({
  isAdmin,
  theme,
  onToggleTheme,
  onLogout,
}) {
  return (
    <header className="uchicago-shell-header">
      <nav className="uchicago-mainnav" aria-label="Hauptnavigation">
        <div className="uchicago-mainnav-side uchicago-mainnav-left">
          <NavLink to="/" end className={({ isActive }) => "uchicago-navlink" + (isActive ? " active" : "")}>
            HOCHSCHULE
          </NavLink>
          <NavLink to="/news" className={({ isActive }) => "uchicago-navlink" + (isActive ? " active" : "")}>
            NEUIGKEITEN
          </NavLink>
          <NavLink to="/fakultaeten" className={({ isActive }) => "uchicago-navlink" + (isActive ? " active" : "")}>
            FAKULTÄTEN
          </NavLink>
          <NavLink to="/raumfinder" className={({ isActive }) => "uchicago-navlink" + (isActive ? " active" : "")}>
            RAUMFINDER
          </NavLink>
        </div>

        <Link to="/" className="uchicago-logo-card" aria-label="Hochschule Mittweida Startseite">
          <img
            src={theme === "dark" ? "/hsmw-logo-white.png" : "/hsmw-logo.png"}
            alt="Hochschule Mittweida"
          />
        </Link>

        <div className="uchicago-mainnav-side uchicago-mainnav-right">
          <NavLink to="/mensa" className={({ isActive }) => "uchicago-navlink" + (isActive ? " active" : "")}>
            MENSA
          </NavLink>
          <NavLink to="/kontakt" className={({ isActive }) => "uchicago-navlink" + (isActive ? " active" : "")}>
            KONTAKTE
          </NavLink>
          {isAdmin && (
            <NavLink to="/module-add" className={({ isActive }) => "uchicago-navlink" + (isActive ? " active" : "")}>
              MODULE
            </NavLink>
          )}
          <Link to={isAdmin ? "/admin/dashboard" : "/admin"} className="uchicago-give">
            VERWALTUNG
          </Link>
          <button
            type="button"
            className="uchicago-theme-toggle"
            onClick={onToggleTheme}
            title={theme === "dark" ? "Zu Hellmodus wechseln" : "Zu Dunkelmodus wechseln"}
            aria-label="Theme umschalten"
          >
            {theme === "dark" ? "Hell" : "Dunkel"}
          </button>
          {isAdmin && (
            <button type="button" onClick={onLogout} className="uchicago-give uchicago-logout">
              ABMELDEN
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
