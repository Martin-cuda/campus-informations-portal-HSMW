#Module der Website
MODULE = [

]
#für Rechte der Admins für Bearbeitung der Module
def generate_default_permission():
    #alle Module erst mit False deklarieren 
    return {modul:False for modul in MODULE}