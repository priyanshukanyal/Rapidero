import axios from "axios";

/**
 * Normalize an origin string:
 *  - Trims spaces
 *  - Removes trailing slashes
 *  - Adds https:// if missing
 */
// function normalizeOrigin(raw?: string): string | "" {
//   const s = (raw || "").trim();
//   if (!s) return "";

//   // If it already starts with http(s), accept it
//   if (/^https?:\/\//i.test(s)) return s.replace(/\/+$/, "");

//   // If it looks like a host (no scheme), prefix https://
//   if (/^[a-z0-9.-]+(\:[0-9]+)?(\/.*)?$/i.test(s)) {
//     return ("https://" + s).replace(/\/+$/, "");
//   }

//   // Anything else is unsafe → ignore
//   return "";
// }

// Read from Vite environment
// const RAW = import.meta.env.VITE_API_BASE_URL || "";

// ✅ If env var is empty, use current domain (same-origin fallback)
const ORIGIN = window.location.origin?.includes("localhost:5173") ? "http://localhost:4000" : "https://rapidero-1-bmf8a6dse7fxascu.centralindia-01.azurewebsites.net";

// ✅ Always append /api/v1 (your backend prefix)
const BASE_URL = `${ORIGIN}/api/v1`;

// Create Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ✅ Attach JWT token if available
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ✅ Auto-logout on 401
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
