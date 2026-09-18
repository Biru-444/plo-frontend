import { createContext, useContext, useState } from "react";
import { login as loginRequest, AUTH_STORAGE_KEY } from "../api/client.js";

const AuthContext = createContext(null);

/**
 * อ่านสถานะล็อกอิน (user + JWT token) ที่เคยบันทึกไว้ใน localStorage ตอนโหลดแอปครั้งแรก
 * เพื่อให้ผู้ใช้ไม่ต้องล็อกอินใหม่ทุกครั้งที่รีเฟรชหน้า - ถ้าไม่มีข้อมูลหรือ parse ไม่ผ่าน
 * (เช่น JSON เพี้ยน) ถือว่ายังไม่ได้ล็อกอิน
 */
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

/**
 * ครอบทั้งแอปเพื่อแชร์สถานะล็อกอิน (user/token) และฟังก์ชัน login/logout ให้ทุก component
 * เรียกใช้ผ่าน useAuth() ได้โดยไม่ต้องส่ง prop ลอดผ่านหลายชั้น
 */
export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);

  async function login(username, password) {
    const data = await loginRequest(username, password);
    const nextAuth = { user: data.user, token: data.access_token };
    // เก็บลง localStorage ด้วยเพื่อให้สถานะล็อกอินอยู่ต่อได้แม้รีเฟรชหน้า (ดู readStoredAuth ด้านบน)
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

/** ดึงสถานะล็อกอิน/ฟังก์ชัน login-logout จาก AuthContext - ต้องเรียกภายใต้ <AuthProvider> เท่านั้น */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
