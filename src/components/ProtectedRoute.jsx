/**
 * ทำอะไร : ห่อ route ไหนก็ได้เพื่อบังคับ login ก่อนเข้าดู (และบังคับ role=admin เพิ่มถ้าใส่
 *          requireAdmin, หรือกันไม่ให้ admin เข้าถ้าใส่ blockAdmin - งานที่เป็นของอาจารย์โดยเฉพาะ เช่น
 *          กรอกคะแนน) — ใช้ห่อทุกหน้าใน App.jsx ยกเว้น /login
 *
 * เชื่อมกับ : อ่าน token/isAdmin จาก useAuth() (AuthContext.jsx) ตรงๆ — ไม่มี token = ยังไม่ login
 *             เลย เด้งไป /login ทันที (ต่างจากกรณี login แล้วแต่ role ไม่พอ ซึ่งแสดงข้อความ "ไม่มี
 *             สิทธิ์เข้าถึง" แทนที่จะเด้งออก ยกเว้น blockAdmin ที่เด้งกลับ /admin แทน เพราะ admin ที่โดน
 *             บล็อกมักจะกดมาจากหน้า /admin เอง การเด้งกลับไปที่เดิมเข้าใจง่ายกว่าโชว์ข้อความ error)
 *
 * ถ้าแก้ : requireAdmin และ blockAdmin ใช้คู่กันไม่ได้ (ไม่มี route ไหนต้องการทั้งคู่พร้อมกัน) - ไม่ได้
 *          เช็คว่า token หมดอายุหรือไม่ที่นี่ (เช็คแค่ว่ามีค่าอยู่หรือเปล่า) - token หมดอายุจริงจะถูกจับ
 *          ตอนยิง API แล้วโดน 401 กลับมา (ดู interceptor ใน api/client.js ที่ redirect ไป /login ให้
 *          อัตโนมัติ)
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children, requireAdmin = false, blockAdmin = false }) {
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

  if (blockAdmin && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
