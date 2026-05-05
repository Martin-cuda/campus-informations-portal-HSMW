import { useEffect, useState } from "react";

const API = "http://localhost:8000";

// Dummy-Daten für wenn das Backend noch keinen Mensa-Endpoint hat
const FALLBACK = [
  { id: 1, name: "Spaghetti Bolognese", category: "Hauptgericht", price: "2,80 €", active: true },
  { id: 2, name: "Gemüse-Curry mit Reis", category: "Vegetarisch", price: "2,50 €", active: true },
  { id: 3, name: "Schnitzel mit Pommes", category: "Hauptgericht", price: "3,20 €", active: true },
  { id: 4, name: "Tagessuppe", category: "Vorspeise", price: "1,20 €", active: true },
];

export default function Mensa() {
  const [meals, setMeals]   = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | fallback | error

  useEffect(() => {
    fetch(`${API}/api/mensa`)
      .then((r) => r.json())
      .then((data) => {
        const active = data.filter?.((m) => m.active !== false) ?? data;
        setMeals(active);
        setStatus("ok");
      })
      .catch(() => {
        // Backend hat noch keinen Mensa-Endpoint → Fallback-Daten zeigen
        setMeals(FALLBACK);
        setStatus("fallback");
      });
  }, []);

  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">🍽 Mensa</div>
        <div className="page-subtitle">Speiseplan · HS Mittweida</div>
      </div>

      {status === "fallback" && (
        <div
          className="fade-up"
          style={{
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: 8,
            padding: "10px 16px",
            fontSize: 13,
            color: "#9a3412",
            marginBottom: 20,
          }}
        >
          ⚠️ Mensa-API noch nicht implementiert – Beispieldaten werden angezeigt.
        </div>
      )}

      {status === "loading" && (
        <div className="state-box fade-up">
          <div className="state-box-icon">⏳</div>
          <div className="state-box-text">Speiseplan wird geladen…</div>
        </div>
      )}

      {(status === "ok" || status === "fallback") && meals.length === 0 && (
        <div className="state-box fade-up">
          <div className="state-box-icon">🤷</div>
          <div className="state-box-text">Heute kein Speiseplan verfügbar.</div>
        </div>
      )}

      {(status === "ok" || status === "fallback") && meals.length > 0 && (
        <div className="meal-grid">
          {meals.map((meal, i) => (
            <div className="meal-card fade-up" key={meal.id ?? i}>
              <div className="meal-name">{meal.name}</div>
              <div className="meal-meta">{meal.category}</div>
              {meal.price && <div className="meal-price">{meal.price}</div>}
              <div style={{ marginTop: 10 }}>
                <span className={`badge ${meal.active ? "badge-green" : "badge-gray"}`}>
                  {meal.active ? "Verfügbar" : "Nicht verfügbar"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
