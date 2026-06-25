const FACULTIES = [
  {
    id: "inw",
    label: "Ingenieurwissenschaften",
    short: "INW",
    color: "#004c97",
    url: "https://www.inw.hs-mittweida.de/",
    intro: "Technische Studienangebote, Forschung und studentische Praxisprojekte rund um moderne Ingenieurwissenschaften.",
    points: ["Studium, Fakultät und Forschung", "InnoLab, Laserinstitut, Formula Student", "interdisziplinäre Zusammenarbeit mit weiteren Fakultäten"],
  },
  {
    id: "cb",
    label: "Angewandte Computer- und Biowissenschaften",
    short: "CB",
    color: "#f97316",
    url: "https://www.cb.hs-mittweida.de/",
    intro: "MINT-Fakultät mit praxisnaher Ausbildung in kleinen Seminargruppen und starkem Forschungsbezug.",
    points: ["Informatik, IT-Sicherheit, Bioinformatik und Biotechnologie", "Praxismodule im Studienablauf", "Kontakt zum Dekanat und Studienangeboten"],
  },
  {
    id: "wi",
    label: "Wirtschaftsingenieurwesen",
    short: "WI",
    color: "#008a4b",
    url: "https://www.wi.hs-mittweida.de/",
    intro: "Anwendungsorientierte Studiengänge mit vielseitigem und internationalem Praxisbezug.",
    points: ["Lehre und Forschung mit Wirtschafts- und Technikbezug", "studentische Initiativen und Netzwerke", "Institute wie ifem und Nachhaltigkeits-/Immobilienmanagement"],
  },
  {
    id: "sw",
    label: "Soziale Arbeit",
    short: "SW",
    color: "#a30b63",
    url: "https://www.sw.hs-mittweida.de/",
    intro: "Studienangebote für soziale Praxis, Menschenrechte, soziale Gerechtigkeit und berufsbegleitende Wege.",
    points: ["Bachelor-, Master- und Zertifikatsstudiengänge", "Informationen für Praxis und Studierende", "Zentrum für Medien und Soziale Arbeit"],
  },
  {
    id: "me",
    label: "Medien",
    short: "ME",
    color: "#5a9f2d",
    url: "https://www.me.hs-mittweida.de/",
    intro: "Medien- und ingenieurwissenschaftliche Studiengänge mit starken studentischen Projekten.",
    points: ["praxisorientierte Projekte wie Campusfestival und medienMITTWEIDA", "moderne Technik im Zentrum für Medien und Soziale Arbeit", "Kooperationen und Branchennähe"],
  },
  {
    id: "inst",
    label: "Institute",
    short: "Forschung",
    color: "#2f6fb6",
    url: "https://www.forschung.hs-mittweida.de/forschungseinrichtungen-institute.html",
    intro: "Übersicht über zentrale wissenschaftliche Einrichtungen, Institute und Forschungsvereine.",
    points: ["IWD, LHM und IKKS", "BCCM, ifem, CSMRT, SICIM und weitere Institute", "Wissens- und Technologietransfer"],
  },
];

export { FACULTIES };

export default function Faculties() {
  return (
    <div className="faculty-page">
      <section className="faculty-hero">
        <p>Hochschule Mittweida</p>
        <h1>Fakultäten und Institute</h1>
        <div>
          Kurzer Überblick über die fünf Fakultäten und die Forschungseinrichtungen der HSMW.
        </div>
      </section>

      <section className="faculty-grid" aria-label="Fakultäten">
        {FACULTIES.map((faculty) => (
          <article id={faculty.id} className="faculty-card" key={faculty.id} style={{ "--faculty-color": faculty.color }}>
            <div className="faculty-card-band" />
            <div className="faculty-card-code">{faculty.short}</div>
            <h2>{faculty.label}</h2>
            <p>{faculty.intro}</p>
            <ul>
              {faculty.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <a href={faculty.url}>Offizielle Seite öffnen</a>
          </article>
        ))}
      </section>
    </div>
  );
}
