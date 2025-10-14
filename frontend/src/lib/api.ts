import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// If the token is invalid/expired, purge it and send user to /login
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
