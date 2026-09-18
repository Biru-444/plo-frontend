import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * ครอบ route ที่ต้องล็อกอินก่อนถึงเข้าได้ - ยังไม่ล็อกอิน (ไม่มี token) เด้งไปหน้า /login
 * ถ้าใส่ requireAdmin ด้วย จะเช็คเพิ่มว่าต้องเป็น role admin เท่านั้น ไม่ใช่ก็ขึ้นข้อความ "ไม่มีสิทธิ์เข้าถึง"
 * แทนเนื้อหาจริง (ไม่ redirect ออกไปไหน)
 */
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
