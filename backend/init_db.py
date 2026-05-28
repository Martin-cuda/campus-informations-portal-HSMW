from datenbank import Base, engine
from admin_table import Admin

Base.metadata.create_all(bind=engine)
print("DB initialisiert")