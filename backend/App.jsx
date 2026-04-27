import { useEffect, useState } from "react";

const API_BASE = "http://localhost:8000";

function App() {
  const [message, setMessage] = useState("Lade...");
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    fetch(`${API_BASE}/api/hello`)
      .then((res) => res.json())
      .then((data) => {
        setMessage(data.message);
        setStatus("ok");
      })
      .catch(() => {
        setMessage("Backend nicht erreichbar – läuft uvicorn?");
        setStatus("error");
      });
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 600 }}>
      <h1>Campus-Informationsportal</h1>
      <h2>HS Mittweida – Informatik II</h2>
      <hr />
      <p>
        <strong>Backend-Status:</strong>{" "}
        <span style={{ color: status === "ok" ? "green" : "red" }}>
          {status === "ok" ? "✅ Verbunden" : "❌ Fehler"}
        </span>
      </p>
      <p>
        <strong>API-Antwort:</strong> {message}
      </p>
      <hr />
      <p style={{ color: "#888", fontSize: "0.85rem" }}>
        Swagger-Doku: <a href="http://localhost:8000/docs">localhost:8000/docs</a>
      </p>
    </div>
  );
}

export default App;
