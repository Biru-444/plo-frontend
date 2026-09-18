/**
 * ทำอะไร : เก็บสถานะการเข้าสู่ระบบ (ผู้ใช้ปัจจุบัน + JWT token) ไว้ใน React Context เดียว ให้ทุก
 *          component ในแอปเรียกอ่าน/เรียก login-logout ได้ผ่าน useAuth() โดยไม่ต้องส่ง props ลอดผ่าน
 *          หลายชั้น
 *
 * เชื่อมกับ : ห่ออยู่รอบ <App /> ทั้งแอปใน main.jsx — เก็บ/อ่านค่าจาก localStorage ตรง ๆ ไม่ได้ยิง
 *             GET /auth/me ไปตรวจสอบกับ backend ซ้ำ (เชื่อ token ที่เก็บไว้ตรง ๆ จนกว่า request อื่น
 *             จะโดน 401 กลับมา) ProtectedRoute.jsx อ่าน user จาก context นี้เพื่อตัดสินใจ redirect
 *             ไป /login
 *
 * ถ้าแก้ : ถ้า localStorage มีข้อมูลเสียหาย/format เก่า readStoredAuth() จะ catch แล้วถือว่ายังไม่
 *          login แทนที่จะทำให้แอป crash ตอนโหลดหน้าแรก
 */
import { createContext, useContext, useState } from "react";
import { login as loginRequest, AUTH_STORAGE_KEY } from "../api/client.js";

const AuthContext = createContext(null);

// อ่านสถานะ login ที่เคยบันทึกไว้ใน localStorage ตอนเปิดแอปครั้งแรก (ใช้เป็นค่าเริ่มต้นของ useState
// ด้านล่าง) — คืนค่า "ยังไม่ login" ถ้าไม่มีข้อมูลหรือข้อมูล parse ไม่ได้
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
  // เก็บ {user, token} ปัจจุบัน — โหลดค่าเริ่มต้นจาก localStorage ครั้งเดียวตอน mount
  const [auth, setAuth] = useState(readStoredAuth);

  // เรียก POST /auth/login แล้วบันทึกผลลัพธ์ (user + token) ทั้งใน state และ localStorage พร้อมกัน
  // เชื่อมกับ : ใช้โดยหน้า Login.jsx — โยน error ต่อขึ้นไปให้หน้านั้นแสดงข้อความผิดพลาดเอง (ไม่ catch
  // ที่นี่)
  async function login(username, password) {
    const data = await loginRequest(username, password);
    const nextAuth = { user: data.user, token: data.access_token };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
    setAuth(nextAuth);
    return nextAuth;
  }

  // ล้างสถานะ login ทั้ง state และ localStorage — ไม่ได้เรียก backend endpoint ใดๆ (JWT เป็นแบบ
  // stateless ฝั่งเซิร์ฟเวอร์ไม่ต้องรู้เรื่อง logout ก็ได้ token แค่ถูกทิ้งฝั่ง client)
  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuth({ user: null, token: null });
  }

  const value = {
    user: auth.user,
    token: auth.token,
    // ใช้ทั่วทั้งแอปเพื่อซ่อน/แสดงเมนู admin โดยไม่ต้องเทียบ auth.user?.role === "admin" ซ้ำทุกที่
    isAdmin: auth.user?.role === "admin",
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// hook สำหรับ component อื่นเรียกอ่าน auth state — throw ทันทีถ้าเรียกใช้นอก <AuthProvider> (บั๊กตอน
// dev ชัดเจนกว่าปล่อยให้ user เป็น undefined เงียบๆ)
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
