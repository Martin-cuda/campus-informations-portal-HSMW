// haeuser.js
// Statische Demo-Daten aller aktiven HSMW-Gebäude.
// Räume sind aktuell Platzhalter – werden später durch echte Raumnummern ersetzt.

// Hilfsfunktion um einen Platzhalter-Raum zu erstellen
// wird für alle Häuser genutzt die noch keine echten Räume haben
const platzhalter = [
  { id: "placeholder", name: "Räume folgen", etage: "-", belegt: false, professor: "", modul: "", bis: "" }
];

// Vollständige Liste aller aktiven HSMW-Gebäude mit ihren Räumen.
// Haus 2 und Haus 6 haben bereits echte Räume, alle anderen haben Platzhalter.
export const initialHaeuser = [
  { id: "haus1",  name: "Haus 1",  raeume: platzhalter },
  { id: "haus2",  name: "Haus 2",  raeume: [
    { id: "002", name: "Raum 002", etage: "EG",    belegt: false, professor: "", modul: "", bis: "" },
    { id: "202", name: "Raum 202", etage: "2. OG", belegt: false, professor: "", modul: "", bis: "" },
  ]},
  { id: "haus3",  name: "Haus 3",  raeume: platzhalter },
  { id: "haus4",  name: "Haus 4",  raeume: platzhalter },
  { id: "haus5",  name: "Haus 5",  raeume: platzhalter },
  { id: "haus6",  name: "Haus 6",  raeume: [
    { id: "101", name: "Raum 101", etage: "1. OG", belegt: false, professor: "", modul: "", bis: "" },
    { id: "401", name: "Raum 401", etage: "4. OG", belegt: false, professor: "", modul: "", bis: "" },
  ]},
  { id: "haus7",  name: "Haus 7",  raeume: platzhalter },
  { id: "haus8",  name: "Haus 8",  raeume: platzhalter },
  { id: "haus9",  name: "Haus 9",  raeume: platzhalter },
  { id: "haus10", name: "Haus 10", raeume: platzhalter },
  { id: "haus11", name: "Haus 11", raeume: platzhalter },
  { id: "haus14", name: "Haus 14", raeume: platzhalter },
  { id: "haus16", name: "Haus 16", raeume: platzhalter },
  { id: "haus17", name: "Haus 17", raeume: platzhalter },
  { id: "haus18", name: "Haus 18", raeume: platzhalter },
  { id: "haus19", name: "Haus 19", raeume: platzhalter },
  { id: "haus20", name: "Haus 20", raeume: platzhalter },
  { id: "haus26", name: "Haus 26", raeume: platzhalter },
  { id: "haus29", name: "Haus 29", raeume: platzhalter },
  { id: "haus30", name: "Haus 30", raeume: platzhalter },
  { id: "haus32", name: "Haus 32", raeume: platzhalter },
  { id: "haus39", name: "Haus 39", raeume: platzhalter },
  { id: "haus40", name: "Haus 40", raeume: platzhalter },
  { id: "haus42", name: "Haus 42", raeume: platzhalter },
  { id: "haus45", name: "Haus 45", raeume: platzhalter },
  { id: "haus47", name: "Haus 47", raeume: platzhalter },
  { id: "haus48", name: "Haus 48", raeume: platzhalter },
];