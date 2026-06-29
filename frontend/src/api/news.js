const API = "";
let newsCache = null;
let newsCacheTs = 0;
let newsRequest = null;
const NEWS_CACHE_MS = 15000;

function clearNewsCache() {
  newsCache = null;
  newsCacheTs = 0;
}

function apiErrorMessage(detail, fallback) {
  if (Array.isArray(detail)) {
    return detail
      .map((entry) => {
        const field = Array.isArray(entry.loc) ? entry.loc[entry.loc.length - 1] : "";
        return field ? `${field}: ${entry.msg}` : entry.msg;
      })
      .filter(Boolean)
      .join("; ") || fallback;
  }

  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") return detail.message || JSON.stringify(detail);
  return fallback;
}

export async function fetchNews() {
  const now = Date.now();
  if (newsCache && now - newsCacheTs < NEWS_CACHE_MS) return newsCache;
  if (!newsRequest) {
    newsRequest = fetch(`${API}/api/news/?limit=20`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        newsCache = Array.isArray(data) ? data : [];
        newsCacheTs = Date.now();
        return newsCache;
      })
      .finally(() => {
        newsRequest = null;
      });
  }
  return newsRequest;
}

export async function fetchNewsDetail(id) {
  const response = await fetch(`${API}/api/news/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const created = await response.json();
  clearNewsCache();
  return created;
}

export async function createNews(news) {
  const token = sessionStorage.getItem("token");
  if (!token) throw new Error("Nicht eingeloggt.");

  const response = await fetch(`${API}/api/news/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(news),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(apiErrorMessage(payload?.detail, `HTTP ${response.status}`));
  }

  const updated = await response.json();
  clearNewsCache();
  return updated;
}

export async function updateNews(id, news) {
  const token = sessionStorage.getItem("token");
  if (!token) throw new Error("Nicht eingeloggt.");

  const response = await fetch(`${API}/api/news/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(news),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(apiErrorMessage(payload?.detail, `HTTP ${response.status}`));
  }

  const deleted = await response.json();
  clearNewsCache();
  return deleted;
}

export async function deleteNews(id) {
  const token = sessionStorage.getItem("token");
  if (!token) throw new Error("Nicht eingeloggt.");

  const response = await fetch(`${API}/api/news/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    if (response.status === 405) {
      throw new Error("L\u00f6schen ist im laufenden Backend noch nicht verf\u00fcgbar. Bitte Backend neu starten.");
    }
    throw new Error(apiErrorMessage(payload?.detail, `HTTP ${response.status}`));
  }

  return await response.json();
}

export async function voteNews(id, direction) {
  const params = new URLSearchParams({ direction: String(direction) });
  const response = await fetch(`${API}/api/news/${encodeURIComponent(id)}/vote?${params.toString()}`, {
    method: "POST",
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const voted = await response.json();
  clearNewsCache();
  return voted;
}
