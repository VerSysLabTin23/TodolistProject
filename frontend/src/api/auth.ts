import { http } from "./http";
import axios from "axios";

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

export type LoginRequest = { username: string; password: string };
export type LoginResponse = {
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
};

export type RegisterRequest = {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
};

export async function login(data: LoginRequest): Promise<LoginResponse> {
    const { data: res } = await http.post<LoginResponse>("/auth/login", data);
    return res;
}

export async function register(data: RegisterRequest): Promise<UserResponse> {
    const { data: res } = await http.post<UserResponse>("/auth/register", data);
    return res;
}

// small helper to extract readable error message
export function getAxiosErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        return (
            (error.response?.data as any)?.message ||
            error.response?.statusText ||
            error.message
        );
    }
    return "Unexpected error";
}
