/**
 * ทำอะไร : แถบด้านบนของ AppLayout — ชื่อผู้ใช้ + เมนู dropdown (ดูโปรไฟล์/ออกจากระบบ)
 *
 * เชื่อมกับ : ใช้ useAuth().logout() แล้ว navigate ไป /login เอง — ไม่ render อะไรเลยถ้ายังไม่ login
 *             (AppLayout ก็ไม่ render Topbar อยู่แล้วในกรณีนั้น แต่กันไว้อีกชั้นเผื่อ user หายระหว่างทาง)
 *
 * ถ้าแก้ : dropdown ปิดเองเมื่อคลิกนอกกล่อง (ดู handleClickOutside) - ถ้าจะเพิ่มเมนูย่อยใหม่ใน dropdown
 *          ต้องปิด dropdown (setOpen(false)) ก่อน navigate เสมอ เหมือนที่ลิงก์ "ดูโปรไฟล์" ทำอยู่
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // dropdown เมนูผู้ใช้เปิด/ปิดอยู่หรือไม่
  const [open, setOpen] = useState(false);
  // ใช้ตรวจว่าคลิกเกิดนอกกล่อง dropdown หรือไม่ (ดู handleClickOutside)
  const containerRef = useRef(null);

  // ปิด dropdown อัตโนมัติเมื่อคลิกที่อื่นนอกกล่องนี้ (ลงทะเบียน listener ที่ document ครั้งเดียว
  // ตอน mount แล้วถอดตอน unmount)
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    setOpen(false);
    logout();
    navigate("/login");
  }

  if (!user) return null;

  const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`;

  return (
    <header className="topbar">
      <div className="topbar-profile" ref={containerRef}>
        <button type="button" className="topbar-profile-trigger" onClick={() => setOpen((v) => !v)}>
          <span className="topbar-avatar">{initials}</span>
          <span className="topbar-username">
            {user.first_name} {user.last_name}
          </span>
          <span className="topbar-chevron">▾</span>
        </button>

        {open && (
          <div className="topbar-dropdown">
            <Link to="/profile" onClick={() => setOpen(false)}>
              ดูโปรไฟล์
            </Link>
            <button type="button" onClick={handleLogout}>
              ออกจากระบบ
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
