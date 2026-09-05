import { Link } from "react-router-dom";
import {
  GraduationCap,
  BookMarked,
  CalendarClock,
  UserCog,
  ClipboardList,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";

// จัดกลุ่มใหม่เป็น 2 โซนตามความถี่การใช้งานจริง แทนการแปะลิงก์ 16 อันเรียงตามชื่อตาราง DB เฉยๆ:
// - "ตั้งค่าหลักสูตร" = ข้อมูลโครงสร้างที่กรอกครั้งเดียวตอนตั้งหลักสูตร ไม่ค่อยกลับมาแก้
// - "งานประจำภาคเรียน" = ข้อมูลที่ต้องเข้ามาทำทุกภาคเรียน (เปิดวิชา/ลงทะเบียน/กรอกคะแนน)
const SETUP_GROUPS = [
  {
    title: "หลักสูตร / PLO / YLO",
    description: "PLO = ผลลัพธ์การเรียนรู้ระดับหลักสูตร, YLO = ผลลัพธ์ระดับชั้นปี",
    icon: GraduationCap,
    links: [
      { to: "/admin/curriculum", label: "หลักสูตร" },
      { to: "/admin/plo", label: "PLO (ผลลัพธ์ระดับหลักสูตร)" },
      { to: "/admin/ylo", label: "YLO (ผลลัพธ์ระดับชั้นปี)" },
      { to: "/admin/ylo-plo-mapping", label: "เชื่อมโยง YLO กับ PLO" },
    ],
  },
  {
    title: "รายวิชา / CLO",
    description: "CLO = ผลลัพธ์การเรียนรู้ระดับรายวิชา",
    icon: BookMarked,
    links: [
      { to: "/admin/course", label: "รายวิชา" },
      { to: "/admin/course-plo", label: "เชื่อมโยงรายวิชากับ PLO" },
      { to: "/admin/study-plan", label: "แผนการศึกษา" },
      { to: "/admin/clo", label: "CLO (ผลลัพธ์ระดับรายวิชา)" },
    ],
  },
];

const OPS_GROUPS = [
  {
    title: "การเปิดสอน / นักศึกษา / ลงทะเบียน",
    description: "ใช้เมนู \"จัดการวิชาที่สอน\" ด้านบนสำหรับงานประจำวัน มาที่นี่เฉพาะตอนต้องแก้ข้อมูลดิบทีละรายการ",
    icon: CalendarClock,
    links: [
      { to: "/admin/course-offerings", label: "การเปิดสอนรายวิชา" },
      { to: "/admin/students", label: "นักศึกษา" },
      { to: "/admin/enrollments", label: "การลงทะเบียนเรียน" },
      { to: "/admin/assessment-items", label: "งานประเมิน" },
      { to: "/admin/item-clo", label: "เชื่อมโยงงานประเมินกับ CLO" },
    ],
  },
];

const USER_GROUPS = [
  {
    title: "ผู้ใช้งาน",
    description: "บัญชีแอดมินและอาจารย์ผู้สอน",
    icon: UserCog,
    links: [{ to: "/admin/users", label: "ผู้ใช้งานระบบ (แอดมิน/อาจารย์)" }],
  },
];

function GroupCard({ group }) {
  return (
    <div className="admin-home-group" key={group.title}>
      <div className="admin-home-group-heading">
        {group.icon && <group.icon size={18} strokeWidth={2} />}
        <h2>{group.title}</h2>
      </div>
      {group.description && <p className="admin-home-group-desc">{group.description}</p>}
      <div className="admin-home-links">
        {group.links.map((link) => (
          <Link key={link.to} to={link.to}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AdminHome() {
  return (
    <div className="page">
      <h1>จัดการระบบ</h1>
      <p className="admin-home-intro">
        PLO (ผลลัพธ์ระดับหลักสูตร) → YLO (ผลลัพธ์ระดับชั้นปี) → รายวิชา → CLO (ผลลัพธ์ระดับรายวิชา) →
        งานประเมิน → คะแนนนักศึกษา
      </p>

      <Link to="/course-workspace" className="admin-home-primary-card">
        <ClipboardList size={22} strokeWidth={2} />
        <div>
          <strong>จัดการวิชาที่สอน</strong>
          <span>ลงทะเบียน + กรอกคะแนนทั้งชั้น + ดูผลบรรลุ CLO ของวิชาหนึ่งๆ ในหน้าเดียว — ใช้เมนูนี้เป็นหลักสำหรับงานประจำภาคเรียน แทนการไล่แก้ทีละเมนูย่อยด้านล่าง</span>
        </div>
        <ArrowRight size={18} />
      </Link>

      <Link to="/admin/roster-import" className="admin-home-primary-card">
        <FileSpreadsheet size={22} strokeWidth={2} />
        <div>
          <strong>นำเข้ารายชื่อจากไฟล์ Excel มหาวิทยาลัย</strong>
          <span>โยนไฟล์ .xls ที่มหาวิทยาลัยส่งให้อาจารย์เข้าไป ระบบจะสร้าง/จับคู่วิชาที่เปิดสอน ผู้สอน และรายชื่อนักศึกษาให้อัตโนมัติ ไม่ต้องพิมพ์ชื่อเอง</span>
        </div>
        <ArrowRight size={18} />
      </Link>

      <section className="admin-home-section">
        <h2 className="admin-home-section-title">ตั้งค่าหลักสูตร</h2>
        <p className="admin-home-section-desc">ทำครั้งเดียวตอนตั้งหลักสูตรใหม่ ปกติไม่ค่อยกลับมาแก้</p>
        <div className="admin-home-groups">
          {SETUP_GROUPS.map((group) => (
            <GroupCard group={group} key={group.title} />
          ))}
        </div>
      </section>

      <section className="admin-home-section">
        <h2 className="admin-home-section-title">งานประจำภาคเรียน</h2>
        <p className="admin-home-section-desc">
          แก้ข้อมูลดิบทีละรายการ (สำรองไว้เผื่อ "จัดการวิชาที่สอน" ด้านบนไม่ครอบคลุม)
        </p>
        <div className="admin-home-groups">
          {OPS_GROUPS.map((group) => (
            <GroupCard group={group} key={group.title} />
          ))}
        </div>
      </section>

      <section className="admin-home-section">
        <h2 className="admin-home-section-title">ผู้ใช้งาน</h2>
        <div className="admin-home-groups">
          {USER_GROUPS.map((group) => (
            <GroupCard group={group} key={group.title} />
          ))}
        </div>
      </section>
    </div>
  );
}
