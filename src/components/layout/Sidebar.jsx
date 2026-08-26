import { NavLink } from "react-router-dom";
import { Home, Users, BookOpen, PieChart, CalendarRange, ClipboardList, Settings } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Sidebar() {
  const { isAdmin, user } = useAuth();

  const isInstructor = user?.role === "instructor";

  // เมนูจัดเรียงตามความถี่การใช้งานจริง: งานประจำ (วิชาที่สอน/นักศึกษา/ภาพรวม) ก่อน
  // ข้อมูลตั้งค่าที่ไม่ค่อยเปลี่ยน (หลักสูตร/รายวิชา) ไว้ท้ายๆ
  // หมายเหตุ 1: หน้า "จัดการคะแนน (รายคน)" (/scores) ยังอยู่ในระบบเหมือนเดิม แค่เอาออกจากเมนูหลัก
  // เพราะซ้ำซ้อนกับ "จัดการวิชาที่สอน" ที่กรอกคะแนนทั้งชั้นได้อยู่แล้ว - เข้าถึงได้ผ่านปุ่ม
  // "แก้ไขคะแนนนักศึกษาคนนี้" ในหน้าโปรไฟล์นักศึกษาแทน (ดู PLOAchievement.jsx)
  // หมายเหตุ 2: หน้าหลักของ admin เปลี่ยนจากช่องค้นหารหัสนักศึกษาเปล่าๆ (PLOAchievement) มาเป็น
  // "ภาพรวม PLO" (PLODashboard, ดู App.jsx) เพราะผู้ใช้เห็นตรงกันว่าไม่มีใครจำรหัสนักศึกษามาพิมพ์
  // ค้นหาเอง - เข้าถึงหน้าโปรไฟล์นักศึกษารายคนได้จากการคลิกชื่อในหน้า "รายชื่อนักศึกษา" แทน จึงไม่มี
  // เมนู "ภาพรวม PLO" แยกซ้ำสำหรับ admin (หน้าหลักคือหน้านี้อยู่แล้ว) แต่ instructor ยังมีแยกต่างหาก
  // เพราะหน้าหลักของ instructor คือ InstructorHome (วิชาที่ตัวเองสอน) ไม่ใช่หน้านี้
  const navItems = [
    {
      to: "/",
      label: isInstructor ? "หน้าหลัก" : "ภาพรวม PLO",
      icon: Home,
      end: true,
    },
    {
      to: "/course-workspace",
      label: "จัดการวิชาที่สอน",
      icon: ClipboardList,
      title: "ลงทะเบียน/กรอกคะแนนทั้งชั้น/ดูผลบรรลุ CLO ของวิชาที่เปิดสอน - ใช้เมนูนี้เป็นหลักสำหรับงานประจำภาคเรียน",
    },
    { to: "/students", label: "รายชื่อนักศึกษา", icon: Users },
    ...(isInstructor
      ? [
          {
            to: "/dashboard",
            label: "ภาพรวม PLO",
            icon: PieChart,
            title: "PLO = ผลลัพธ์การเรียนรู้ระดับหลักสูตร - ภาพรวมทั้งชั้นเรียน/หลักสูตร",
          },
        ]
      : []),
    {
      to: "/plo-by-year",
      label: "PLO ตามชั้นปี",
      icon: CalendarRange,
      title: "ดูความก้าวหน้าการบรรลุ PLO แยกตามชั้นปี",
    },
    { to: "/curriculum", label: "หลักสูตร/รายวิชา", icon: BookOpen },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        {/* TODO: เปลี่ยนเป็นไฟล์โลโก้จริงของมหาวิทยาลัยตรงนี้ */}
        <div className="sidebar-logo-circle">CS</div>
        <span className="sidebar-logo-text">CS PLO</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} title={item.title}>
            <item.icon size={18} strokeWidth={2} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink to="/admin">
            <Settings size={18} strokeWidth={2} />
            <span>จัดการระบบ</span>
          </NavLink>
        )}
      </nav>
    </aside>
  );
}
