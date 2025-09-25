import axios from "axios";
import { logout } from "../auth/session";

export const API_BASE_URL =
    import.meta.env.VITE_AUTH_API_BASE_URL ?? "/api";

export const http = axios.create({
    baseURL: API_BASE_URL,
});

// optional: attach token automatically if present
http.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// response interceptor: on 401, try refresh once and retry original request
let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

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

http.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config;
        if (!original || original._retry) {
            return Promise.reject(error);
        }
        if (error?.response?.status === 401) {
            if (isRefreshing) {
                await new Promise<void>((resolve) => pendingQueue.push(resolve));
                // after refresh finished, attach new token and retry
                original.headers = original.headers || {};
                const t = localStorage.getItem("accessToken");
                if (t) original.headers.Authorization = `Bearer ${t}`;
                original._retry = true;
                return http(original);
            }
            isRefreshing = true;
            const newToken = await refreshAccessToken();
            isRefreshing = false;
            pendingQueue.forEach((fn) => fn());
            pendingQueue = [];
            if (newToken) {
                original.headers = original.headers || {};
                original.headers.Authorization = `Bearer ${newToken}`;
                original._retry = true;
                return http(original);
            }
            // refresh failed – logout
            logout();
        }
        return Promise.reject(error);
    }
);
