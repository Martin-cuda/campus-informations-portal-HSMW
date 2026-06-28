const API = "";

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
  const response = await fetch(`${API}/api/news/`, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
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

  return await response.json();
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

  return await response.json();
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
  return await response.json();
}
