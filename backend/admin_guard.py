# ── ARI: Admin-Guard / Rollen-Check (Ticket 2 + 3) ───────────────────────
#
# Wrapper um Jerome's get_current_user (auth.py), der zusätzlich prüft, dass
# der eingeloggte User existiert UND eine Admin-Rolle hat (primary_admin
# oder secondary_admin – siehe admin_table.Admin.role).
#
# Damit können wir Admin-Endpoints in Routern absichern:
#
#     from admin_guard import require_admin
#
#     @router.get("/api/admin/...")
#     def secret(admin = Depends(require_admin)): ...
#
# Bei jedem geschützten Aufruf wird das JWT validiert und das Admin-Objekt
# aus der DB nachgeladen. Wenn der Token ungültig oder der User keine
# Admin-Rolle mehr hat → 403.
# ──────────────────────────────────────────────────────────────────────────

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user            # JWT-Decode (Jerome)
from datenbank import get_db
from admin_table import Admin


# Erlaubte Rollen für Admin-Bereich. Erweiterbar wenn später neue Rollen
# eingeführt werden (z.B. "auditor").
ADMIN_ROLES = {"primary_admin", "secondary_admin"}


def require_admin(
    username: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Admin:
    """
    FastAPI-Dependency. Liefert das Admin-Objekt oder wirft 403/401.
    Verwendung:  admin = Depends(require_admin)
    """
    user = db.query(Admin).filter(Admin.name == username).first()
    if not user:
        # JWT war zwar gültig signiert, aber der User ist nicht (mehr) in der DB.
        # Kann passieren wenn ein Admin gelöscht wurde, sein Token aber noch lebt.
        raise HTTPException(status_code=401, detail="Admin nicht (mehr) vorhanden")

    if user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admin-Berechtigung erforderlich")

    return user


def require_primary_admin(admin: Admin = Depends(require_admin)) -> Admin:
    """
    Strengerer Guard – nur "primary_admin" darf weiter.
    Aktuell nicht benutzt, aber für später (z.B. Admin-Anlage) sinnvoll.
    """
    if admin.role != "primary_admin":
        raise HTTPException(status_code=403, detail="Nur Haupt-Admin erlaubt")
    return admin
