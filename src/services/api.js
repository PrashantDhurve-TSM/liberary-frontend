import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});
let refreshPromise;

const clearStoredSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth:logout"));
};

export const refreshAccessToken = () => {
  if (!refreshPromise) {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      const error = new Error("No refresh token is available. Please sign in again.");
      clearStoredSession();
      return Promise.reject(error);
    }

    refreshPromise = refreshClient
      .post("/auth/refresh", { refreshToken })
      .then(({ data: response }) => {
        const authData = response?.data?.data ?? response?.data ?? response;
        if (
          typeof authData?.accessToken !== "string" ||
          !authData.accessToken ||
          typeof authData?.refreshToken !== "string" ||
          !authData.refreshToken ||
          !authData.user
        ) {
          throw new Error("The server returned an invalid refresh response.");
        }

        const session = {
          user: authData.user,
          accessToken: authData.accessToken,
        };
        localStorage.setItem("token", session.accessToken);
        localStorage.setItem("refreshToken", authData.refreshToken);
        localStorage.setItem("user", JSON.stringify(session.user));
        window.dispatchEvent(
          new CustomEvent("auth:token-refreshed", { detail: session }),
        );
        return session;
      })
      .catch((error) => {
        clearStoredSession();
        throw error;
      })
      .finally(() => {
        refreshPromise = undefined;
      });
  }
  return refreshPromise;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const canRefresh =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      localStorage.getItem("refreshToken") &&
      !originalRequest.url?.includes("/auth/");

    if (canRefresh) {
      originalRequest._retry = true;

      try {
        const session = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
        return api(originalRequest);
      } catch {
        // refreshAccessToken clears the stored session and emits auth:logout.
      }
    }

    if (error.response?.status === 401 && !canRefresh) {
      clearStoredSession();
    }
    return Promise.reject(error);
  },
);

export default api;
