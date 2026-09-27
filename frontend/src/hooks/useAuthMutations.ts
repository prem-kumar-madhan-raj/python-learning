import { useMutation } from "@tanstack/react-query";
import apiClient from "../api/client";
import type { AuthResponse, LoginRequest, SignupRequest } from "../types/auth";

export function useLoginMutation() {
  return useMutation({
    mutationFn: async (payload: LoginRequest) => {
      const { data } = await apiClient.post<AuthResponse>("/auth/login", payload);
      return data;
    },
  });
}

export function useSignupMutation() {
  return useMutation({
    mutationFn: async (payload: SignupRequest) => {
      const { data } = await apiClient.post<AuthResponse>("/auth/signup", payload);
      return data;
    },
  });
}