import { Link } from "react-router-dom";
import {
  GraduationCap,
  Target,
  CalendarCheck,
  Link2,
  ClipboardList,
  BookMarked,
  CalendarClock,
  Flag,
  FileText,
  Users,
  UserPlus,
  UserCog,
  PencilLine,
  FileSpreadsheet,
  ArrowRight,
  Info,
} from "lucide-react";

// จัด ~14 เมนูย่อยเป็น card grid แยก section แทนแผงปุ่มขอบเทายาวๆ ("button soup") เดิม - ตัดสินใจ
// ร่วมกับผู้ใช้ 2026-09-08 (การ์ด grid รองรับจำนวนรายการเยอะได้ดีกว่า sidebar/accordion ซ้อน ที่จะกลาย
// เป็น tree ลึก 3 ชั้น) คำอธิบายสอนใช้งานยาวๆ ที่เคยกางค้างไว้ทั้งหน้า ย้ายไปไว้ใน title tooltip ของไอคอน
// (i) ข้างหัวข้อ section แทน (ยังมีประโยชน์กับผู้ใช้ใหม่ แค่ไม่ต้องกางค้างตลอด) - แต่ละการ์ดเหลือแค่ไอคอน
// + หัวข้อสั้น + คำบรรยายย่อยบรรทัดเดียว
const SECTIONS = [
  {
    key: "curriculum",
    title: "โครงสร้างหลักสูตร",
    tooltip: "ข้อมูลตั้งค่าโครงสร้างหลักสูตร - ทำครั้งเดียวตอนตั้งหลักสูตรใหม่ ปกติไม่ค่อยกลับมาแก้",
    items: [
      { to: "/admin/curriculum", label: "หลักสูตร", sublabel: "ชื่อและปีหลักสูตร", icon: GraduationCap },
      { to: "/admin/plo", label: "PLO", sublabel: "ผลลัพธ์การเรียนรู้ระดับหลักสูตร", icon: Target },
      { to: "/admin/ylo", label: "YLO", sublabel: "ผลลัพธ์การเรียนรู้ระดับชั้นปี", icon: CalendarCheck },
      {
        to: "/admin/ylo-plo-mapping",
        label: "YLO-PLO Mapping",
        sublabel: "เชื่อมโยง YLO กับ PLO ที่เกี่ยวข้อง",
        icon: Link2,
      },
      {
        to: "/admin/study-plan",
        label: "แผนการศึกษา",
        sublabel: "วิชาที่ต้องเรียนแต่ละชั้นปี",
        icon: ClipboardList,
      },
    ],
  },
  {
    key: "academics",
    title: "จัดการเรียนการสอน",
    tooltip:
      "จัดการรายวิชา การเปิดสอน และโครงสร้างการประเมิน (CLO/งานประเมิน) ทีละรายการ - ถ้าต้องการกรอกคะแนน/ดูผลบรรลุ CLO ของวิชาหนึ่งในหน้าเดียว ใช้การ์ด \"กรอกคะแนน / ผลบรรลุ CLO\" ด้านบนแทน",
    items: [
      { to: "/admin/course", label: "รายวิชา", sublabel: "รหัส ชื่อ หน่วยกิตรายวิชา", icon: BookMarked },
      {
        to: "/admin/course-plo",
        label: "รายวิชา-PLO Mapping",
        sublabel: "เชื่อมโยงรายวิชากับ PLO ที่รับผิดชอบ",
        icon: Link2,
      },
      {
        to: "/admin/course-offerings",
        label: "การเปิดสอน",
        sublabel: "เปิดวิชา กำหนดผู้สอนต่อภาคเรียน",
        icon: CalendarClock,
      },
      { to: "/admin/clo", label: "CLO", sublabel: "ผลลัพธ์การเรียนรู้ระดับรายวิชา", icon: Flag },
      {
        to: "/admin/assessment-items",
        label: "งานประเมิน",
        sublabel: "ควิซ สอบกลางภาค สอบปลายภาคต่อวิชา",
        icon: FileText,
      },
      {
        to: "/admin/item-clo",
        label: "งานประเมิน-CLO Mapping",
        sublabel: "ผูกน้ำหนักงานประเมินกับ CLO",
        icon: Link2,
      },
    ],
  },
  {
    key: "students",
    title: "นักศึกษา & ลงทะเบียน",
    items: [
      { to: "/admin/students", label: "นักศึกษา", sublabel: "ข้อมูลนักศึกษารายบุคคล", icon: Users },
      {
        to: "/admin/enrollments",
        label: "การลงทะเบียน",
        sublabel: "ลงทะเบียนนักศึกษาเข้าวิชาทีละคน",
        icon: UserPlus,
      },
      {
        to: "/admin/roster-import",
        label: "นำเข้ารายชื่อนักศึกษา",
        sublabel: "รองรับไฟล์ .xlsx / .xls จากระบบทะเบียน",
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    key: "users",
    title: "ผู้ใช้งานระบบ",
    items: [
      {
        to: "/admin/users",
        label: "บัญชีผู้ใช้",
        sublabel: "บัญชีแอดมินและอาจารย์ผู้สอน",
        icon: UserCog,
      },
    ],
  },
];

function SectionHeading({ title, tooltip }) {
  return (
    <div className="admin-home-section-heading">
      <h2 className="admin-home-section-title">{title}</h2>
      {tooltip && <Info size={13} className="admin-home-info-icon" title={tooltip} />}
    </div>
  );
}

function ItemCard({ to, label, sublabel, icon: Icon }) {
  return (
    <Link to={to} className="admin-home-card">
      <Icon size={20} strokeWidth={2} className="admin-home-card-icon" />
      <div className="admin-home-card-text">
        <span className="admin-home-card-title">{label}</span>
        {sublabel && <span className="admin-home-card-subtitle">{sublabel}</span>}
      </div>
    </Link>
  );
}

export default function AdminHome() {
  return (
    <div className="page">
      <h1>จัดการระบบ</h1>

      <Link to="/admin/course-grading" className="admin-home-primary-card">
        <PencilLine size={22} strokeWidth={2} />
        <div>
          <strong>กรอกคะแนน / ผลบรรลุ CLO</strong>
          <span>กรอกคะแนนทั้งชั้น + ดูผลบรรลุ CLO ของวิชาหนึ่งในหน้าเดียว</span>
        </div>
        <Info
          size={14}
          className="admin-home-primary-card-info"
          title='ใช้เมนูนี้เป็นหลักสำหรับงานประจำภาคเรียน ส่วนลงทะเบียนนักศึกษาไปที่ "การลงทะเบียน" ด้านล่างแทน'
        />
        <ArrowRight size={18} />
      </Link>

      <Link to="/admin/roster-import" className="admin-home-primary-card">
        <FileSpreadsheet size={22} strokeWidth={2} />
        <div>
          <strong>นำเข้ารายชื่อจากไฟล์ Excel มหาวิทยาลัย</strong>
          <span>รองรับไฟล์ .xlsx / .xls จากระบบทะเบียน</span>
        </div>
        <Info
          size={14}
          className="admin-home-primary-card-info"
          title="โยนไฟล์ .xls ที่มหาวิทยาลัยส่งให้อาจารย์เข้าไป ระบบจะสร้าง/จับคู่วิชาที่เปิดสอน ผู้สอน และรายชื่อนักศึกษาให้อัตโนมัติ ไม่ต้องพิมพ์ชื่อเอง"
        />
        <ArrowRight size={18} />
      </Link>

      {SECTIONS.map((section) => (
        <section className="admin-home-section" key={section.key}>
          <SectionHeading title={section.title} tooltip={section.tooltip} />
          <div className="admin-home-card-grid">
            {section.items.map((item) => (
              <ItemCard key={item.to} {...item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
