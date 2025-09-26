// Shared Axios HTTP client
//
// Purpose:
// - Provide a single Axios instance (`http`) configured with the API base URL.
// - Attach Authorization header automatically when an access token is present.
// - Handle 401s by attempting a single refresh-token flow and then retrying
//   the original request transparently.
// - If refresh fails, perform a local logout.
//
// Base URL:
// - Defaults to "/api" (Nginx gateway) unless overridden by VITE_AUTH_API_BASE_URL.
//   This lets the same code run locally (via the gateway) and in CI/CD/staging.


import axios from "axios";
import { logout } from "../auth/session";

// Decide where to send requests. In dev, the Nginx gateway serves "/api/*".
export const API_BASE_URL =
    import.meta.env.VITE_AUTH_API_BASE_URL ?? "/api";

// Create the singleton Axios instance used across the app.
export const http = axios.create({
    baseURL: API_BASE_URL,
});

// -------------------------------------------------------------
// Request interceptor
// - Injects the JWT access token (if present) into every request.
// -------------------------------------------------------------
http.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
        config.headers = config.headers ?? {};
        (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
    return config;
});

// -------------------------------------------------------------
// Refresh flow state
// - Prevent multiple parallel refresh calls; queue pending requests.
// -------------------------------------------------------------
let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

/**
 * Attempt to exchange the refreshToken for a new accessToken.
 * Returns the *new* access token string on success, otherwise null.
 */
async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return null;
    try {
        const { data } = await http.post<{ accessToken: string; refreshToken: string }>("/auth/refresh", { refreshToken });
        localStorage.setItem("accessToken", data.accessToken);
        if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
        // Notify listeners (e.g., WS) that token changed
        try { window.dispatchEvent(new Event("auth:token-refreshed")); } catch { /* ignore */ }
        return data.accessToken;
    } catch {
        return null;
    }
}

// -------------------------------------------------------------
// Response interceptor
// - If a request returns 401, try to refresh once and then retry.
// - If refresh fails, log the user out (clears tokens & state).
// -------------------------------------------------------------
http.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config;
        // If we don't have a request config, or we've already retried, just fail.
        if (!original || original._retry) {
            return Promise.reject(error);
        }
        if (error?.response?.status === 401) {
            // If a refresh is in progress, wait for it to finish, then replay.
            if (isRefreshing) {
                await new Promise<void>((resolve) => pendingQueue.push(resolve));
                // after refresh finished, attach new token and retry
                original.headers = original.headers || {};
                const t = localStorage.getItem("accessToken");
                if (t) original.headers.Authorization = `Bearer ${t}`;
                original._retry = true;
                return http(original);
            }

            // Start a refresh cycle.
            isRefreshing = true;
            const newToken = await refreshAccessToken();
            isRefreshing = false;
            // Release all queued requests.
            pendingQueue.forEach((fn) => fn());
            pendingQueue = [];
            if (newToken) {
                original.headers = original.headers || {};
                original.headers.Authorization = `Bearer ${newToken}`;
                original._retry = true;
                return http(original);
            }
            // Could not refresh → perform local logout (clears tokens, routes away).
            logout();
        }
        // Non-401, or no retry → propagate error.
        return Promise.reject(error);
    }
);
