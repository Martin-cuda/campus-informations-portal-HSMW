import { NavLink, Link } from "react-router-dom";

const CONTACT_URL = "https://www.hs-mittweida.de/newsampservice/kontakt/";

export default function Navbar({
  isAdmin,
  theme,
  onToggleTheme,
  onLogout,
}) {
  return (
    <header className="uchicago-shell-header">
      <div className="uchicago-topbar" aria-label="Schnellnavigation">
        <div className="uchicago-topbar-group">
          <Link to="/news">NEUIGKEITEN</Link>
          <Link to="/mensa">MENSA</Link>
          <Link to="/raumfinder">RAUMFINDER</Link>
          <Link to="/kontakt">KONTAKTE</Link>
        </div>
        <div className="uchicago-topbar-group uchicago-topbar-right">
          <Link to="/">BESUCH</Link>
          <a href={CONTACT_URL}>KONTAKT</a>
          <Link to="/kontakt">VERZEICHNIS</Link>
          <span className="uchicago-search" aria-hidden="true">Suche</span>
        </div>
      </div>

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
          <a className="uchicago-navlink" href={CONTACT_URL}>KONTAKT</a>
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
