import { createContext, useContext, useState } from "react";
import { login as loginRequest, AUTH_STORAGE_KEY } from "../api/client.js";

const AuthContext = createContext(null);

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { user: null, token: null };
    const parsed = JSON.parse(raw);
    return { user: parsed.user ?? null, token: parsed.token ?? null };
  } catch {
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);

  async function login(username, password) {
    const data = await loginRequest(username, password);
    const nextAuth = { user: data.user, token: data.access_token };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
    setAuth(nextAuth);
    return nextAuth;
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuth({ user: null, token: null });
  }

  const value = {
    user: auth.user,
    token: auth.token,
    isAdmin: auth.user?.role === "admin",
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
