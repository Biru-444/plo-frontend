/**
 * ทำอะไร : ห่อ route ไหนก็ได้เพื่อบังคับ login ก่อนเข้าดู (และบังคับ role=admin เพิ่มถ้าใส่
 *          requireAdmin) — ใช้ห่อทุกหน้าใน App.jsx ยกเว้น /login
 *
 * เชื่อมกับ : อ่าน token/isAdmin จาก useAuth() (AuthContext.jsx) ตรงๆ — ไม่มี token = ยังไม่ login
 *             เลย เด้งไป /login ทันที (ต่างจากกรณี login แล้วแต่ role ไม่พอ ซึ่งแสดงข้อความ "ไม่มี
 *             สิทธิ์เข้าถึง" แทนที่จะเด้งออก)
 *
 * ถ้าแก้ : ไม่ได้เช็คว่า token หมดอายุหรือไม่ที่นี่ (เช็คแค่ว่ามีค่าอยู่หรือเปล่า) - token หมดอายุจริง
 *          จะถูกจับตอนยิง API แล้วโดน 401 กลับมา (ดู interceptor ใน api/client.js ที่ redirect ไป
 *          /login ให้อัตโนมัติ)
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { token, isAdmin } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="page">
        <p className="error-message">ไม่มีสิทธิ์เข้าถึง</p>
      </div>
    );
  }

  return children;
}
