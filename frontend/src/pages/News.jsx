import { useEffect, useMemo, useState } from "react";
import { createNews, fetchNews, voteNews } from "../api/news";

const EMPTY_FORM = {
  title: "",
  date: new Date().toISOString().slice(0, 10),
  category: "Campusleben / Events",
  teaser: "",
  body: "",
  author: "Campus-Portal Redaktion",
  image: "",
};

function formatDate(value) {
  if (!value) return "";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function News() {
  const [news, setNews] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [expanded, setExpanded] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState("");

  const isAdmin = !!sessionStorage.getItem("token");

  const sortedNews = useMemo(() => {
    return [...news].sort((a, b) => {
      const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
      if (dateCompare !== 0) return dateCompare;
      return (b.score || 0) - (a.score || 0);
    });
  }, [news]);

  const loadNews = () => {
    setStatus("loading");
    setErrorMsg("");
    fetchNews()
      .then((items) => {
        setNews(items);
        setStatus("ok");
      })
      .catch((err) => {
        setErrorMsg(err.message || String(err));
        setStatus("error");
      });
  };

  useEffect(() => {
    loadNews();
  }, []);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateForm("image", String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormMsg("");

    try {
      const created = await createNews(form);
      setNews((prev) => [created, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setFormMsg("Meldung wurde veröffentlicht.");
    } catch (err) {
      setFormMsg(err.message || "News konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  };

  const handleVote = async (id, direction) => {
    try {
      const updated = await voteNews(id, direction);
      setNews((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      console.warn("Voting fehlgeschlagen:", err);
    }
  };

  return (
    <div>
      <div className="page-header news-header module-header module-news fade-up">
        <div>
          <div className="page-title">Neuigkeiten</div>
          <div className="page-subtitle">Aktuelle Meldungen der Hochschule Mittweida</div>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="btn-primary news-add-button"
            onClick={() => setShowForm((open) => !open)}
          >
            {showForm ? "Formular schließen" : "+ Meldung hinzufügen"}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <form className="card news-form fade-up" onSubmit={handleSubmit}>
          <div className="news-form-title">Neuen News-Beitrag erstellen</div>

          <label className="login-label">Titel</label>
          <input
            className="login-input"
            value={form.title}
            onChange={(event) => updateForm("title", event.target.value)}
            placeholder="Titel der News"
            required
          />

          <div className="news-form-grid">
            <div>
              <label className="login-label">Datum</label>
              <input
                className="login-input"
                type="date"
                value={form.date}
                onChange={(event) => updateForm("date", event.target.value)}
                required
              />
            </div>
            <div>
              <label className="login-label">Kategorie</label>
              <input
                className="login-input"
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value)}
                placeholder="z.B. Campusleben / Events"
                required
              />
            </div>
          </div>

          <label className="login-label">Teaser</label>
          <textarea
            className="login-input news-textarea news-textarea-small"
            value={form.teaser}
            onChange={(event) => updateForm("teaser", event.target.value)}
            placeholder="Kurze Zusammenfassung für die Übersicht"
            required
          />

          <div className="news-form-grid">
            <div>
              <label className="login-label">Bild-URL</label>
              <input
                className="login-input"
                value={form.image}
                onChange={(event) => updateForm("image", event.target.value)}
                placeholder="https://... oder /Campusfoto.jpg"
              />
            </div>
            <div>
              <label className="login-label">Bild hinzufügen</label>
              <input
                className="login-input"
                type="file"
                accept="image/*"
                onChange={(event) => handleImageFile(event.target.files?.[0])}
              />
            </div>
          </div>

          {form.image && (
            <div className="news-image-preview">
              <img src={form.image} alt="Vorschau" />
            </div>
          )}

          <label className="login-label">Artikeltext</label>
          <textarea
            className="login-input news-textarea"
            value={form.body}
            onChange={(event) => updateForm("body", event.target.value)}
            placeholder="Vollständiger Artikeltext"
            required
          />

          <label className="login-label">Autor</label>
          <input
            className="login-input"
            value={form.author}
            onChange={(event) => updateForm("author", event.target.value)}
            placeholder="Campus-Portal Redaktion"
          />

          <div className="btn-row">
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? "Wird gespeichert..." : "Meldung veröffentlichen"}
            </button>
            <button className="btn-secondary" type="button" onClick={() => setForm(EMPTY_FORM)}>
              Leeren
            </button>
          </div>

          {formMsg && <div className="news-form-message">{formMsg}</div>}
        </form>
      )}

      {!isAdmin && (
        <div className="news-admin-hint fade-up">
          Als Admin einloggen, um neue Meldungen mit Bildern zu erstellen.
        </div>
      )}

      {formMsg && !showForm && <div className="news-admin-hint fade-up">{formMsg}</div>}

      {status === "loading" && (
        <div className="state-box fade-up">
          <div className="state-box-text">News werden geladen...</div>
        </div>
      )}

      {status === "error" && (
        <div className="state-box fade-up">
          <div className="state-box-text">
            News konnten nicht geladen werden.
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{errorMsg}</div>
          </div>
        </div>
      )}

      {status === "ok" && sortedNews.length === 0 && (
        <div className="state-box fade-up">
          <div className="state-box-text">Noch keine News vorhanden.</div>
        </div>
      )}

      {status === "ok" && sortedNews.length > 0 && (
        <section className="latest-news-section fade-up">
          <div className="latest-news-title">
            <h2>AKTUELLE MELDUNGEN</h2>
            <span />
          </div>

          <div className="latest-news-grid">
            {sortedNews.map((item) => {
              const isExpanded = !!expanded[item.id];
              const comments = Array.isArray(item.comments) ? item.comments : [];
              const bodyParagraphs = String(item.body || "")
                .split(/\n+/)
                .map((part) => part.trim())
                .filter(Boolean);

              return (
                <article className="latest-news-card" key={item.id}>
                  <div className="latest-news-image">
                    <img src={item.image || "/Campusfoto.jpg"} alt="" />
                  </div>
                  <div className="latest-news-body">
                    <div className="news-post-meta">
                      <span>{item.category}</span>
                      <span>{formatDate(item.date)}</span>
                    </div>

                    <h2>{item.title}</h2>
                    <p>{item.teaser}</p>

                    {isExpanded && (
                      <div className="latest-news-expanded">
                        {bodyParagraphs.map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                      </div>
                    )}

                    <div className="news-post-actions">
                      <button
                        type="button"
                        className="news-link-button"
                        onClick={() => setExpanded((prev) => ({ ...prev, [item.id]: !isExpanded }))}
                      >
                        {isExpanded ? "Weniger anzeigen" : "Artikel lesen"}
                      </button>
                      <button type="button" className="news-link-button" onClick={() => handleVote(item.id, 1)}>
                        + {item.score ?? 0}
                      </button>
                      <span>{comments.length} Kommentar{comments.length === 1 ? "" : "e"}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
