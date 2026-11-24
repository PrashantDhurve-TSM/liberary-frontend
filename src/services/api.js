import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const AUTH_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";

const jsonConfig = {
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
};

const refreshClient = axios.create({
  ...jsonConfig,
});

let refreshPromise;

const clearStoredSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("auth:logout"));
};

export const refreshAccessToken = () => {
  if (!refreshPromise) {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
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
        localStorage.setItem(AUTH_TOKEN_KEY, session.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, authData.refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(session.user));
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
  ...jsonConfig,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers = config.headers || {};
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
    const requestUrl = originalRequest?.url || "";
    const canRefresh =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      localStorage.getItem(REFRESH_TOKEN_KEY) &&
      !requestUrl.includes("/auth/");

    if (canRefresh) {
      originalRequest._retry = true;

      try {
        const session = await refreshAccessToken();
        originalRequest.headers = originalRequest.headers || {};
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
