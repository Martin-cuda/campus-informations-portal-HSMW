import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Link } from "react-router-dom";

export default function Navbar({
  isAdmin,
  theme,
  onToggleTheme,
  onLogout,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const menuPanelRef = useRef(null);

  const navItems = [
    { to: "/", label: "Hochschule", end: true },
    { to: "/news", label: "Neuigkeiten" },
    { to: "/fakultaeten", label: "Fakultäten" },
    { to: "/raumfinder", label: "Raumfinder" },
    { to: "/mensa", label: "Mensa" },
    { to: "/kontakt", label: "Kontakte" },
  ];

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    };

    document.body.classList.add("mobile-menu-open");
    window.addEventListener("keydown", onKeyDown);
    window.requestAnimationFrame(() => {
      menuPanelRef.current?.querySelector("a, button")?.focus();
    });

    return () => {
      document.body.classList.remove("mobile-menu-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen, closeMobileMenu]);

  return (
    <header className="uchicago-shell-header">
      <div className="mobile-campus-header" aria-label="Mobile Hauptnavigation">
        <button
          type="button"
          ref={menuButtonRef}
          className="mobile-menu-button"
          aria-label={mobileMenuOpen ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-campus-menu"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <Link to="/" className="mobile-brand-badge" aria-label="bttrhsmw Startseite">
          <img
            src={theme === "dark" ? "/hsmw-logo-white.png" : "/hsmw-logo.png"}
            alt=""
          />
          <span>bttrhsmw</span>
        </Link>

        <Link to="/kontakt" className="mobile-search-button" aria-label="Suche und Kontakte öffnen">
          <span className="mobile-search-icon" aria-hidden="true" />
        </Link>
      </div>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className="mobile-menu-backdrop"
            aria-label="Menü schließen"
            onClick={closeMobileMenu}
          />
          <div
            id="mobile-campus-menu"
            className="mobile-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Hauptmenü"
            ref={menuPanelRef}
          >
            <div className="mobile-menu-head">
              <div>
                <span>Campus Portal</span>
                <strong>bttrhsmw</strong>
              </div>
              <button type="button" className="mobile-menu-close" onClick={closeMobileMenu} aria-label="Menü schließen">
                X
              </button>
            </div>

            <nav className="mobile-menu-links" aria-label="Mobile Navigation">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={closeMobileMenu}
                  className={({ isActive }) => "mobile-menu-link" + (isActive ? " active" : "")}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="mobile-menu-actions">
              <Link to={isAdmin ? "/admin/dashboard" : "/admin"} onClick={closeMobileMenu} className="mobile-menu-action">
                Verwaltung
              </Link>
              <button type="button" onClick={onToggleTheme} className="mobile-menu-action">
                {theme === "dark" ? "Hellmodus" : "Dunkelmodus"}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    onLogout();
                  }}
                  className="mobile-menu-action"
                >
                  Abmelden
                </button>
              )}
            </div>
          </div>
        </>
      )}

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
