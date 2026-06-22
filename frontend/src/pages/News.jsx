import { useEffect, useMemo, useState } from "react";
import { createNews, fetchNews, voteNews } from "../api/news";

const EMPTY_FORM = {
  title: "",
  date: new Date().toISOString().slice(0, 10),
  category: "Campusleben / Events",
  teaser: "",
  body: "",
  author: "Campus-Portal Redaktion",
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormMsg("");

    try {
      const created = await createNews(form);
      setNews((prev) => [created, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setFormMsg("News wurde veroeffentlicht.");
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
      <div className="page-header news-header fade-up">
        <div>
          <div className="page-title">News</div>
          <div className="page-subtitle">Campus-Forum fuer aktuelle Meldungen der HS Mittweida</div>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="btn-primary news-add-button"
            onClick={() => setShowForm((open) => !open)}
          >
            {showForm ? "Formular schliessen" : "+ News hinzufuegen"}
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
            placeholder="Kurze Zusammenfassung fuer die Uebersicht"
            required
          />

          <label className="login-label">Artikeltext</label>
          <textarea
            className="login-input news-textarea"
            value={form.body}
            onChange={(event) => updateForm("body", event.target.value)}
            placeholder="Vollstaendiger Artikeltext"
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
              {saving ? "Wird gespeichert..." : "News veroeffentlichen"}
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
          Als Admin einloggen, um neue News zu erstellen.
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
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{errorMsg}</div>
          </div>
        </div>
      )}

      {status === "ok" && sortedNews.length === 0 && (
        <div className="state-box fade-up">
          <div className="state-box-text">Noch keine News vorhanden.</div>
        </div>
      )}

      {status === "ok" && sortedNews.length > 0 && (
        <div className="news-feed fade-up">
          {sortedNews.map((item) => {
            const isExpanded = !!expanded[item.id];
            const comments = Array.isArray(item.comments) ? item.comments : [];
            const bodyParagraphs = String(item.body || "")
              .split(/\n+/)
              .map((part) => part.trim())
              .filter(Boolean);

            return (
              <article className="news-post" key={item.id}>
                <div className="news-vote">
                  <button type="button" onClick={() => handleVote(item.id, 1)} aria-label="Upvote">
                    ▲
                  </button>
                  <div>{item.score ?? 0}</div>
                  <button type="button" onClick={() => handleVote(item.id, -1)} aria-label="Downvote">
                    ▼
                  </button>
                </div>

                <div className="news-post-main">
                  <div className="news-post-meta">
                    <span>{item.category}</span>
                    <span>{formatDate(item.date)}</span>
                    <span>{item.author || "Campus-Portal Redaktion"}</span>
                  </div>

                  <h2 className="news-post-title">{item.title}</h2>
                  <p className="news-post-teaser">{item.teaser}</p>

                  {isExpanded && (
                    <div className="news-post-body">
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
                    <span>{comments.length} Kommentar{comments.length === 1 ? "" : "e"}</span>
                  </div>

                  {isExpanded && comments.length > 0 && (
                    <div className="news-comments">
                      {comments.map((comment, index) => (
                        <div className="news-comment" key={index}>
                          <div className="news-comment-meta">
                            {comment.author || "Anonym"} · {comment.created_at || ""}
                          </div>
                          <div>{comment.body}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
