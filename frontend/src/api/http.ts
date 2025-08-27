import axios from "axios";

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
