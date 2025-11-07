import axios from "axios";

function normalizeOrigin(raw?: string): string | "" {
  const s = (raw || "").trim();
  if (!s) return "";

  // If it already starts with http(s), accept it
  if (/^https?:\/\//i.test(s)) return s.replace(/\/+$/, "");

  // If it looks like a host (no scheme), prefix https://
  if (/^[a-z0-9.-]+(\:[0-9]+)?(\/.*)?$/i.test(s)) {
    return ("https://" + s).replace(/\/+$/, "");
  }

  // Anything else is unsafe → ignore
  return "";
}

const RAW = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "";
const ORIGIN = normalizeOrigin(RAW);

// Final base URL
// - If ORIGIN provided → `${ORIGIN}/api/v1`
// - Else use relative `/api/v1` (best for same-origin deployment)
const BASE_URL = ORIGIN ? `${ORIGIN}/api/v1` : "/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
//$2b$10$UAC5UgJu4iro4MMlQGXipOkcKbtWQPdt5Ra05LNrND0u/2VoHnKx6
