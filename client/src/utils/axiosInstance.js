// src/utils/axiosInstance.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:9090",
  withCredentials: true,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("wu_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-redirect to login on 401 — BUT skip for routes that are
// intentionally called before login (e.g. premium status check)
const SKIP_REDIRECT_URLS = ["/api/payment/status"];

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || "";
      const shouldSkip = SKIP_REDIRECT_URLS.some((skip) => url.includes(skip));
      if (!shouldSkip) {
        localStorage.removeItem("wu_token");
        window.location.href = "/";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
