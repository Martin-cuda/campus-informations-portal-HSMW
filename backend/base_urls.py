# ──────────────────────────────────────────────────────────────────────────
# base_urls.py  – zentrale Aufloesung der Basis-URLs fuer E-Mail-Links
#
# Sorgt dafuer, dass Links (Abo bestaetigen / abbestellen, Passwort-Reset)
# plattform- und geraeteuebergreifend funktionieren – lokal, im LAN (Handy)
# und wenn die App im Netz gehostet ist.
#
# Aufloesungs-Reihenfolge:
#   1. Explizite ENV-Variable, die NICHT auf localhost zeigt   -> nehmen.
#      (Fall "Frontend und Backend auf getrennten Domains")
#   2. Sonst aus einem eingehenden Request ableiten (Schema + Host),
#      ABER nur wenn der Host vertrauenswuerdig ist (Allowlist).
#      (Fall "alles hinter einem Proxy / einer Domain" + LAN-Zugriff)
#   3. Sonst Fallback: ENV-Wert bzw. localhost-Default (Dev).
#
# Security: Der aus dem Request abgeleitete Host wird gegen eine Allowlist
# geprueft. Ohne diese Pruefung koennte ein gefaelschter Host-Header eine
# fremde Domain in die versendeten Mail-Links schmuggeln (Host-Header-
# Injection). Die Allowlist kommt aus CORS_ORIGINS / TRUSTED_HOSTS plus den
# bekannten Prod-Domains und localhost.
# ──────────────────────────────────────────────────────────────────────────

import os
from urllib.parse import urlsplit

# Hosts, die als "lokal/Dev" gelten und daher NICHT als feste Prod-URL zaehlen.
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}

# Default-Allowlist (per ENV CORS_ORIGINS / TRUSTED_HOSTS erweiterbar).
_DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:8080",
    "https://bttrhsmw-b3b60.web.app",
    "https://bttrhsmw-b3b60.firebaseapp.com",
    "https://definitvnichtcheck24.xyz",  # Cloudflare-Tunnel-Domain (Live-Hosting)
]


def _env(key, default=""):
    return (os.getenv(key) or default).strip()


def configured_origins():
    """Erlaubte Origins (CORS + vertrauenswuerdige Hosts), ENV-erweiterbar."""
    raw = _env("CORS_ORIGINS")
    if raw:
        origins = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
    else:
        origins = list(_DEFAULT_ORIGINS)
    extra = _env("TRUSTED_HOSTS")
    if extra:
        origins += [o.strip().rstrip("/") for o in extra.split(",") if o.strip()]
    return origins


def _hostname_of(value):
    """Extrahiert den reinen Hostnamen (ohne Port/Schema) aus origin/host."""
    netloc = urlsplit(value if "://" in value else "//" + value).netloc or value
    return netloc.split("@")[-1].split(":")[0].lower()


def _trusted_hostnames():
    hosts = set(_LOCAL_HOSTS)
    for o in configured_origins():
        h = _hostname_of(o)
        if h:
            hosts.add(h)
    return hosts


def _host_is_trusted(host):
    if not host:
        return False
    return _hostname_of(host) in _trusted_hostnames()


def _is_localish(url):
    if not url:
        return True
    return (urlsplit(url).hostname or "").lower() in _LOCAL_HOSTS


def _from_request(request):
    """
    Schema + Host aus dem (ggf. ueber einen Proxy laufenden) Request ableiten.
    Gibt None zurueck, wenn kein Request da ist oder der Host nicht in der
    Allowlist steht (Schutz vor Host-Header-Injection).
    """
    if request is None:
        return None
    headers = getattr(request, "headers", None) or {}
    url = getattr(request, "url", None)

    proto = (headers.get("x-forwarded-proto")
             or getattr(url, "scheme", "")
             or "http").split(",")[0].strip()
    host = (headers.get("x-forwarded-host")
            or headers.get("host")
            or getattr(url, "netloc", "")).split(",")[0].strip()

    if not host or not _host_is_trusted(host):
        return None
    return (proto + "://" + host).rstrip("/")


def _resolve(env_key, default, request):
    env_val = _env(env_key).rstrip("/")
    # 1) Explizite, nicht-lokale ENV gewinnt (getrennte Domains).
    if env_val and not _is_localish(env_val):
        return env_val
    # 2) Aus vertrauenswuerdigem Request ableiten (Proxy / LAN / Hosting).
    derived = _from_request(request)
    if derived:
        return derived
    # 3) Fallback: ENV (auch localhost) oder Default.
    return (env_val or default).rstrip("/")


def public_base_url(request=None):
    """Basis-URL des Backends – fuer /api/...-Links in Mails (Abo-Confirm/Unsub)."""
    return _resolve("PUBLIC_BASE_URL", "http://localhost:8000", request)


def frontend_base_url(request=None):
    """Basis-URL des Frontends – fuer /reset-password und 'Zurueck zum Portal'."""
    return _resolve("FRONTEND_BASE_URL", "http://localhost:5173", request)
