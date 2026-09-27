import { createContext, useContext, useState, type ReactNode } from "react";
import type { TokenPayload } from "../types/auth";

const decodeToken = (token: string): TokenPayload => {
  return JSON.parse(atob(token.split(".")[1]));
};

interface AuthState {
  token: string | null;
  user: TokenPayload | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("access_token"));
  const [user, setUser] = useState<TokenPayload | null>(() => {
    const stored = localStorage.getItem("access_token");
    return stored ? decodeToken(stored) : null;
  });

  function login(newToken: string) {
    localStorage.setItem("access_token", newToken);
    setToken(newToken);
    setUser(decodeToken(newToken));
  }

  function logout() {
    localStorage.removeItem("access_token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}