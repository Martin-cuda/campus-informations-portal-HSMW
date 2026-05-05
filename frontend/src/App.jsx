import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Mensa from "./pages/Mensa";
import News from "./pages/News";
import AdminLogin from "./pages/AdminLogin";
import ModuleAdd from "./pages/ModuleAdd";
import "./index.css";

export default function App() {
  const [extraModules, setExtraModules] = useState([]);

  const addModule = (mod) => {
    setExtraModules((prev) => [...prev, mod]);
  };

  const baseModules = [
    { id: "mensa", label: "Mensa", icon: "🍽", path: "/mensa" },
    { id: "news",  label: "News",  icon: "📰", path: "/news"  },
  ];

  const allModules = [...baseModules, ...extraModules];

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar modules={allModules} />
        <main className="main-content">
          <Routes>
            <Route path="/"           element={<Dashboard modules={allModules} />} />
            <Route path="/mensa"      element={<Mensa />} />
            <Route path="/news"       element={<News />} />
            <Route path="/admin"      element={<AdminLogin />} />
            <Route path="/module-add" element={<ModuleAdd onAdd={addModule} existing={allModules} />} />
            <Route path="*"           element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
