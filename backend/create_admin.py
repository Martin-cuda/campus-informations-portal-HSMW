from sqlalchemy.orm import Session
from datenbank import SessionLocal
from admin_table import Admin
from module import generate_default_permission, generate_main_permission
import json
from security import hash_password



def create_admin(name: str, password: str, mail: str):
    db: Session = SessionLocal()
    default_permissions = {}
    try:
        new_admin = Admin(name = name, 
                          password = hash_password(password), 
                          role = "secondary_admin", 
                          #alle rechte von Modulen werden erstmal als "False" deklariert
                          permissions = json.dumps(generate_default_permission()),
                          last_password_reset_request = None,
                          mail = mail)
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        print(f"Admin angelegt: {new_admin.id} - {new_admin.name}")
    except Exception as e:
        db.rollback()
        print("Fehler:", e)
    finally:
        db.close()


def create_admin_main(name: str, password: str, mail: str):
    db: Session = SessionLocal()
    default_permissions = {}
    try:
        new_admin = Admin(name = name, 
                          password = hash_password(password), 
                          role = "primary_admin", 
                          #alle rechte von Modulen werden erstmal als "False" deklariert
                          permissions = json.dumps(generate_main_permission()),
                          last_password_reset_request = None,
                          mail = mail)
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
    create_admin_main("HauptAdmin", "hsmwPORTAL", "hsmwinfoportal.recovery@gmail.com")
    create_admin("Journalist", "123abc", "hsmwinfoportal.recovery@gmail.come") 
    create_admin("Journalist", "InfoHSMW", "hsmwinfoportal.recovery@gmail.com")
    create_admin("Mensa", "essenHSMW", "hsmwinfoportal.recovery@gmail.com")
    create_admin("Haeuser", "HausHSMW", "hsmwinfoportal.recovery@gmail.com")
