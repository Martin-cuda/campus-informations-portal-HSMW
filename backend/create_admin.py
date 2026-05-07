from sqlalchemy.orm import Session
from datenbank import SessionLocal
from admin_table import Admin
from module import generate_default_permission
import json



def create_admin(name: str, password: str):
    db: Session = SessionLocal()
    default_permissions = {}
    try:
        new_admin = Admin(name = name, 
                          password = password, 
                          role = "secondary_admin", 
                          #alle rechte von Modulen werden erstmal als "False" deklariert
                          permissions = json.dumps(generate_default_permission()))
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        print(f"Admin angelegt: {new_admin.id} - {new_admin.name}")
    except Exception as e:
        db.rollback()
        print("Fehler:", e)
    finally:
        db.close()

if __name__ == "__main__":
    create_admin("Journalist", "123abc") 