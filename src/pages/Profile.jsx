/**
 * ทำอะไร : หน้าแสดงข้อมูลบัญชีผู้ใช้ปัจจุบัน (อ่านอย่างเดียว ไม่มีฟอร์มแก้ไข)
 *
 * เชื่อมกับ : อ่านข้อมูลจาก useAuth() (AuthContext.jsx) ตรงๆ ไม่ได้ยิง API เพิ่มเลย — route มาจาก
 *             App.jsx เส้นทาง "/profile" (admin และ instructor เข้าได้)
 *
 * ถ้าแก้ : คืน null ถ้ายังไม่มี user (กันหน้าขาวพังตอน render ก่อน AuthContext โหลดเสร็จ - ในทาง
 *          ปฏิบัติไม่ควรเกิดเพราะ ProtectedRoute กัน route นี้ไว้แล้วถ้ายังไม่ login)
 */
import { useAuth } from "../context/AuthContext.jsx";

export default function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  // อักษรย่อชื่อ-นามสกุล (เช่น "สมชาย ใจดี" -> "สจ") ใช้แสดงใน avatar วงกลม
  const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`;

  return (
    <div className="page profile-page">
      <h1>โปรไฟล์</h1>

      <div className="profile-card">
        <div className="profile-card-header">
          <div className="profile-avatar-lg">{initials}</div>
          <p className="profile-name">
            {user.first_name} {user.last_name}
          </p>
          <span className={`badge-role ${user.role}`}>{user.role}</span>
        </div>

        <div className="profile-card-body">
          <div className="profile-field">
            <span className="profile-field-label">Username</span>
            <span className="profile-field-value">{user.username}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">อีเมล</span>
            <span className="profile-field-value">{user.email || "-"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
