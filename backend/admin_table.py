from sqlalchemy import Column, Integer, String
from datenbank import Base

#Tabelle für Admins erstellen
class Admin(Base):
    __tablename__ = "admins"

    #Spalten in der Datenbank
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    password = Column(String)
    mail = Column(String)
    permissions = Column(String) #als JSON für Klappleiste
    role = Column(String, default="secondary_admin") #neuer erstellter Admin ist automatisch secondary
