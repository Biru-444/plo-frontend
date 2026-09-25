/**
 * ทำอะไร : ศูนย์รวมเมนูจัดการระบบของ admin (route "/admin") — การ์ด grid แบ่งเป็น section ตามหมวดงาน
 *          ไม่มี logic/state อะไรในหน้านี้เลย เป็นแค่การจัดวาง config ล้วนๆ — เดิมเคยมีการ์ดพิเศษ 2 อัน
 *          (กรอกคะแนน/ผลบรรลุ CLO และนำเข้ารายชื่อ) ยกไว้ด้านบนสุด เอาออกแล้ว (2026-09-25) เพราะ "กรอก
 *          คะแนน/ผลบรรลุ CLO" ย้ายไปเป็นงานของอาจารย์เท่านั้น (ดู /admin/course-grading ใน App.jsx) และ
 *          "นำเข้ารายชื่อ" ยังมีการ์ดเดิมอยู่ในหมวด "เครื่องมือเสริม" ด้านล่างอยู่แล้ว ไม่ต้องมีซ้ำ
 *
 * เชื่อมกับ : ทุก item ใน SECTIONS ลิงก์ไปหน้า admin/* ที่ตรงกับ route ใน App.jsx (requireAdmin ทุก
 *             เส้นทาง) — "การเปิดสอน" (/admin/course-offerings), "งานประเมิน"
 *             (/admin/assessment-items), "งานประเมิน-CLO Mapping" (/admin/item-clo) ไม่มีการ์ดในหน้านี้
 *             แล้วเช่นกัน (2026-09-25) แต่ route ยังอยู่ เข้าได้ด้วย URL ตรงเท่านั้น (ตัดสินใจร่วมกับ
 *             ผู้ใช้แล้วว่าไม่ต้องหาที่ทางอื่นให้)
 *
 * ถ้าแก้ : เพิ่มเมนูใหม่ให้เติมใน SECTIONS (หรือสร้าง section ใหม่) ไม่ใช่เขียน JSX แยกในฟังก์ชัน
 *          AdminHome ตรงๆ เพื่อให้ layout/สไตล์สอดคล้องกันทั้งหน้า
 */
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Target,
  CalendarCheck,
  Link2,
  ClipboardList,
  BookMarked,
  Flag,
  Users,
  UserPlus,
  UserCog,
  FileSpreadsheet,
  Sparkles,
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
    tooltip:
      "ตั้งค่าข้อมูลหลักของหลักสูตรตามลำดับ: หลักสูตร → PLO → รายวิชา → CLO → YLO ควรทำตามลำดับจากซ้ายไปขวา เพราะแต่ละขั้นต้องใช้ข้อมูลจากขั้นก่อนหน้า",
    items: [
      { to: "/admin/curriculum", label: "หลักสูตร", sublabel: "ชื่อและปีหลักสูตร", icon: GraduationCap },
      { to: "/admin/plo", label: "PLO", sublabel: "ผลลัพธ์การเรียนรู้ระดับหลักสูตร", icon: Target },
      { to: "/admin/course", label: "รายวิชา", sublabel: "รหัส ชื่อ หน่วยกิตรายวิชา", icon: BookMarked },
      { to: "/admin/clo", label: "CLO", sublabel: "ผลลัพธ์การเรียนรู้ระดับรายวิชา", icon: Flag },
      { to: "/admin/ylo", label: "YLO", sublabel: "ผลลัพธ์การเรียนรู้ระดับชั้นปี", icon: CalendarCheck },
    ],
  },
  {
    key: "academics",
    title: "จัดการเรียนการสอน",
    tooltip: "เชื่อมโยง CLO ของรายวิชา และ YLO ของแต่ละชั้นปี เข้ากับ PLO ของหลักสูตร",
    items: [
      {
        to: "/admin/clo-plo-mapping",
        label: "CLO-PLO Mapping",
        sublabel: "เชื่อมโยง CLO กับ PLO ที่เกี่ยวข้องโดยตรง",
        icon: Link2,
      },
      {
        to: "/admin/ylo-plo-mapping",
        label: "YLO-PLO Mapping",
        sublabel: "เชื่อมโยง YLO กับ PLO ที่เกี่ยวข้อง",
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
  {
    key: "tools",
    title: "เครื่องมือเสริม",
    tooltip:
      "นำเข้าข้อมูลจาก มคอ.2 / มคอ.3 ด้วย AI (ตรวจสอบก่อนบันทึก), จัดแผนการศึกษา และนำเข้ารายชื่อนักศึกษาจากไฟล์ Excel",
    items: [
      {
        to: "/admin/curriculum-import-mco2",
        label: "นำเข้าหลักสูตร/PLO จาก มคอ.2 ด้วย AI",
        sublabel: "อัปโหลด .pdf/.docx แกะชื่อ/ปีหลักสูตร+PLO ให้ตรวจก่อนบันทึก",
        icon: Sparkles,
      },
      {
        to: "/admin/course-import-mco3",
        label: "นำเข้าวิชาจาก มคอ.3 ด้วย AI",
        sublabel: "อัปโหลด .pdf/.docx แกะวิชา+CLO+PLO mapping ให้ตรวจก่อนบันทึก",
        icon: Sparkles,
      },
      {
        to: "/admin/study-plan",
        label: "แผนการศึกษา",
        sublabel: "วิชาที่ต้องเรียนแต่ละชั้นปี",
        icon: ClipboardList,
      },
      {
        to: "/admin/roster-import",
        label: "นำเข้ารายชื่อนักศึกษา",
        sublabel: "รองรับไฟล์ .xlsx / .xls จากระบบทะเบียน",
        icon: FileSpreadsheet,
      },
    ],
  },
];

// หัวข้อ section พร้อมไอคอน (i) ที่มี title tooltip แสดงคำอธิบายยาวเมื่อ hover (แทนที่จะกางข้อความ
// ค้างไว้ทั้งหน้าแบบเดิม)
function SectionHeading({ title, tooltip }) {
  return (
    <div className="admin-home-section-heading">
      <h2 className="admin-home-section-title">{title}</h2>
      {tooltip && <Info size={13} className="admin-home-info-icon" title={tooltip} />}
    </div>
  );
}

// การ์ดเมนูย่อย 1 อัน (ไอคอน + หัวข้อ + คำบรรยายย่อย) — คลิกแล้วลิงก์ไปหน้า admin ที่เกี่ยวข้อง
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
