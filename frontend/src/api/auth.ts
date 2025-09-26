// Authentication API client
//
// This module talks to the Auth service through the shared Axios instance
// exported by ./http (whose baseURL is `/api`). All routes here are *public*
// (do not require an existing token): login and register.
// Successful login returns access & refresh tokens plus the current user.
//
// It also exports a small helper to extract a human-readable error from Axios.


import { http } from "./http";
import axios, { AxiosError } from "axios";

/** Minimal shape of a user object returned by the Auth service. */
export type UserResponse = {
    id: number;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

/** Request payload for login. */
export type LoginRequest = { username: string; password: string };

/** Response payload for login: tokens + the logged-in user. */
export type LoginResponse = {
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
};

/** Request payload for user registration. */
export type RegisterRequest = {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
};

/** Optional error body the backend might return for Axios to surface. */
type ApiErrorBody = { message?: string; code?: string };

/**
 * POST /api/auth/login
 *
 * Performs username/password login. The shared Axios instance attaches baseURL
 * `/api`, so the full URL is `/api/auth/login` as expected by the Nginx
 * gateway, which forwards to the auth-service `/auth/login`.
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
    const { data: res } = await http.post<LoginResponse>("/auth/login", data);
    return res;
}

/**
 * POST /api/auth/register
 *
 * Creates a new user account. Returns the created user object (without tokens).
 */
export async function register(data: RegisterRequest): Promise<UserResponse> {
    const { data: res } = await http.post<UserResponse>("/auth/register", data);
    return res;
}

/**
 * Extract a human-readable error message from any Axios error, falling back
 * to generic strings when details are absent.
 */
export function getAxiosErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const axErr = error as AxiosError<ApiErrorBody>;
        return axErr.response?.data?.message
            ?? axErr.response?.statusText
            ?? axErr.message;
    }
    return "Unexpected error";
}
