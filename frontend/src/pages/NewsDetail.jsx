import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteNews, fetchNews, updateNews } from "../api/news";

const EMPTY_EDIT_FORM = {
  title: "",
  date: "",
  category: "",
  teaser: "",
  body: "",
  author: "",
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

export default function NewsDetail() {
  const { newsId } = useParams();
  const navigate = useNavigate();
  const [news, setNews] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formMsg, setFormMsg] = useState("");
  const isAdmin = !!sessionStorage.getItem("token");

  useEffect(() => {
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
  }, []);

  const item = useMemo(() => {
    const wantedId = decodeURIComponent(newsId || "");
    return news.find((entry) => String(entry.id) === wantedId);
  }, [news, newsId]);

  const bodyParagraphs = String(item?.body || "")
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const startEditing = () => {
    if (!item) return;
    setEditForm({
      title: item.title || "",
      date: String(item.date || "").slice(0, 10),
      category: item.category || "",
      teaser: item.teaser || "",
      body: item.body || "",
      author: item.author || "Campus-Portal Redaktion",
      image: item.image || "",
    });
    setFormMsg("");
    setEditing(true);
  };

  const updateEditForm = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateEditForm("image", String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!item) return;
    setSaving(true);
    setFormMsg("");

    try {
      const updated = await updateNews(item.id, {
        ...editForm,
        date: String(editForm.date || "").slice(0, 10),
      });
      setNews((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      setEditing(false);
      setFormMsg("Meldung wurde aktualisiert.");
    } catch (err) {
      setFormMsg(err.message || "Meldung konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event) => {
    event?.preventDefault();
    event?.stopPropagation();

    if (!item?.id) {
      setFormMsg("Meldung konnte nicht gel\u00f6scht werden: Keine ID gefunden.");
      return;
    }

    const confirmed = window.confirm(`Meldung \"${item.title}\" wirklich l\u00f6schen?`);
    if (!confirmed) return;

    setDeleting(true);
    setFormMsg("");

    try {
      await deleteNews(item.id);
      setNews((prev) => prev.filter((entry) => entry.id !== item.id));
      navigate("/news");
    } catch (err) {
      setFormMsg(err.message || "Meldung konnte nicht gel\u00f6scht werden.");
    } finally {
      setDeleting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="state-box fade-up">
        <div className="state-box-text">Meldung wird geladen...</div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="state-box fade-up">
        <div className="state-box-text">
          Meldung konnte nicht geladen werden.
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{errorMsg}</div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="news-detail-page fade-up">
        <Link to="/news" className="news-detail-back">Zurück zu den Meldungen</Link>
        <div className="state-box">
          <div className="state-box-text">Diese Meldung wurde nicht gefunden.</div>
        </div>
      </div>
    );
  }

  return (
    <article className="news-detail-page fade-up">
      <Link to="/news" className="news-detail-back">Zurück zu den Meldungen</Link>

      {isAdmin && (
        <div className="news-detail-admin-actions">
          <button type="button" className="btn-primary" onClick={startEditing}>
            Meldung bearbeiten
          </button>
          <button type="button" className="btn-secondary news-danger-button" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Wird gelöscht..." : "Meldung löschen"}
          </button>
        </div>
      )}

      {formMsg && <div className="news-admin-hint">{formMsg}</div>}

      {isAdmin && editing && (
        <form className="card news-form news-detail-edit-form" onSubmit={handleSubmit} noValidate>
          <div className="news-form-title">Meldung bearbeiten</div>

          <label className="login-label">Titel</label>
          <input
            className="login-input"
            value={editForm.title}
            onChange={(event) => updateEditForm("title", event.target.value)}
            required
          />

          <div className="news-form-grid">
            <div>
              <label className="login-label">Datum</label>
              <input
                className="login-input"
                type="date"
                value={editForm.date}
                onChange={(event) => updateEditForm("date", event.target.value)}
                required
              />
            </div>
            <div>
              <label className="login-label">Kategorie</label>
              <input
                className="login-input"
                value={editForm.category}
                onChange={(event) => updateEditForm("category", event.target.value)}
                required
              />
            </div>
          </div>

          <label className="login-label">Teaser</label>
          <textarea
            className="login-input news-textarea news-textarea-small"
            value={editForm.teaser}
            onChange={(event) => updateEditForm("teaser", event.target.value)}
            required
          />

          <div className="news-form-grid">
            <div>
              <label className="login-label">Bild-URL</label>
              <input
                className="login-input"
                value={editForm.image}
                onChange={(event) => updateEditForm("image", event.target.value)}
                placeholder="https://... oder /Campusfoto.jpg"
              />
            </div>
            <div>
              <label className="login-label">Bild ersetzen</label>
              <input
                className="login-input"
                type="file"
                accept="image/*"
                onChange={(event) => handleImageFile(event.target.files?.[0])}
              />
            </div>
          </div>

          {editForm.image && (
            <div className="news-image-preview">
              <img src={editForm.image} alt="Vorschau" />
            </div>
          )}

          <label className="login-label">Artikeltext</label>
          <textarea
            className="login-input news-textarea"
            value={editForm.body}
            onChange={(event) => updateEditForm("body", event.target.value)}
            required
          />

          <label className="login-label">Autor</label>
          <input
            className="login-input"
            value={editForm.author}
            onChange={(event) => updateEditForm("author", event.target.value)}
          />

          <div className="btn-row">
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? "Wird gespeichert..." : "\u00c4nderungen speichern"}
            </button>
            <button className="btn-secondary" type="button" onClick={() => setEditing(false)}>
              Abbrechen
            </button>
            <button
              className="btn-secondary news-danger-button"
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving}
            >
              {deleting ? "Wird gel\u00f6scht..." : "Meldung l\u00f6schen"}
            </button>
          </div>
          {formMsg && <div className="news-form-message">{formMsg}</div>}
        </form>
      )}

      <header className="news-detail-header">
        <div className="news-detail-meta">
          <span>{item.category}</span>
          <span>{formatDate(item.date)}</span>
          {item.author && <span>{item.author}</span>}
        </div>
        <h1>{item.title}</h1>
        {item.teaser && <p>{item.teaser}</p>}
      </header>

      <div className="news-detail-image">
        <img src={item.image || "/Campusfoto.jpg"} alt="" />
      </div>

      <div className="news-detail-body">
        {bodyParagraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
