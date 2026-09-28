/**
 * ทำอะไร : หน้าจัดการ CLO (ผลลัพธ์การเรียนรู้ระดับรายวิชา) — config ตาราง+ฟอร์มให้ CrudManager
 *          รับผิดชอบ UI ทั้งหมด หน้านี้เตรียม dropdown ตัวเลือกรายวิชา (courseOptions) และ enrich
 *          แต่ละแถวด้วยคอลัมน์ "PLO ที่ผูกไว้" (displayOnly - ดู CrudManager.jsx) ก่อนส่งให้ CrudManager
 *
 * เชื่อมกับ : เรียก GET/POST/PUT/DELETE /clo ผ่าน api/client.js — route มาจาก App.jsx เส้นทาง
 *             "/admin/clo" (admin เท่านั้น — instructor จัดการ CLO ของวิชาตัวเองผ่านช่องทางอื่น)
 *             คอลัมน์ "PLO ที่ผูกไว้" join จาก listCLOPLOMapping()+listPLO() ฝั่ง frontend เอง (ไม่มี
 *             backend endpoint ใหม่) ผ่าน list ที่ custom ไว้แทน listCLO() ตรงๆ
 *
 * ถ้าแก้ : pass_threshold_percent ที่แก้ที่นี่กระทบการตัดสิน CLO ผ่าน/ไม่ผ่านย้อนหลังทั้งหมดทันที (ดู
 *          app/models/clo.py ฝั่ง backend) - ผูก/ถอด PLO ทำที่หน้า "/admin/clo-plo-mapping" แยก
 *          ไม่ใช่ที่นี่ (คอลัมน์นี้แสดงอย่างเดียว ไม่ใช่ตัวจัดการ)
 *
 *          "ประเภท" (domain) บังคับเลือกเสมอทั้งตอนสร้างและแก้ไข (CLO เก่าที่ยังเป็น NULL อยู่ - สร้าง
 *          ก่อนมีการบังคับ หรือมาจากการนำเข้า มคอ.3 ที่ AI แยกไม่ได้ - ต้องเลือกก่อนถึงจะบันทึกได้ เพราะ
 *          column นี้ required: true ใช้ทั้ง 2 โหมด ไม่ได้แยก required เฉพาะตอนสร้าง) ใช้ค่าเดิมที่มีอยู่
 *          แล้วคือ clo.domain (Workstream 4 ของเพื่อน) ไม่ได้เพิ่มคอลัมน์ใหม่ - ดู src/utils/cloDomain.js
 */
import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listCourses,
  listCLO,
  createCLO,
  updateCLO,
  deleteCLO,
  listCLOPLOMapping,
  listPLO,
} from "../../api/client.js";
import { CLO_DOMAIN_OPTIONS, CLO_DOMAIN_LABEL_TH } from "../../utils/cloDomain.js";

// ช่อง "ประเภท" ของฟอร์ม CLO - เหมือน PLOCategoryField ของ AdminPLO.jsx แต่จำกัดแค่ 4 ตัวเลือกตายตัว
// เท่านั้น ไม่มี "อื่นๆ" พิมพ์เอง (ตามที่ผู้ใช้ยืนยัน 2026-09-27 - domain เก็บเป็น Literal ปิดตายฝั่ง
// backend ไม่รองรับข้อความอิสระ) - export ไว้ให้ CourseOfferingWorkspace.jsx ใช้ซ้ำด้วย (2026-09-28 -
// อาจารย์จัดการ CLO ของวิชาตัวเองได้แล้ว ใช้ฟอร์มแบบเดียวกัน)
export function CLODomainField({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="" disabled>
        -- เลือกประเภท --
      </option>
      {CLO_DOMAIN_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export default function AdminCLO() {
  // ตัวเลือกรายวิชาสำหรับ dropdown ในฟอร์ม
  const [courseOptions, setCourseOptions] = useState([]);

  // โหลดรายชื่อวิชาครั้งเดียวตอนเปิดหน้า
  useEffect(() => {
    listCourses().then((data) =>
      setCourseOptions(data.map((c) => ({ value: c.id, label: `${c.course_code} ${c.name_th}` })))
    );
  }, []);

  // แทน listCLO() ตรงๆ ด้วยตัวที่ join ข้อมูล PLO ที่ผูกไว้ต่อ CLO มาด้วย (คอลัมน์ displayOnly ด้านล่าง)
  // - ยิง 3 endpoint พร้อมกันทุกครั้งที่ CrudManager โหลด/รีโหลดตาราง (ตอนเปิดหน้า และหลังบันทึก/ลบทุกครั้ง)
  async function listCLOWithPloCodes() {
    const [clos, mappings, plos] = await Promise.all([listCLO(), listCLOPLOMapping(), listPLO()]);
    const ploCodeById = Object.fromEntries(plos.map((p) => [p.id, p.code]));
    const codesByCloId = {};
    mappings.forEach((m) => {
      const code = ploCodeById[m.plo_id];
      if (!code) return;
      (codesByCloId[m.clo_id] ??= []).push(code);
    });
    return clos.map((c) => ({
      ...c,
      plo_codes_display: (codesByCloId[c.id] || []).sort().join(", ") || "-",
    }));
  }

  const columns = [
    { key: "course_id", label: "รายวิชา", type: "select", options: courseOptions, required: true },
    { key: "code", label: "รหัส CLO (เช่น CLO1)", type: "text", required: true },
    { key: "description", label: "คำอธิบาย", type: "text", required: true },
    {
      key: "domain",
      label: "ประเภท",
      type: "custom",
      required: true,
      render: (value, onChange) => <CLODomainField value={value} onChange={onChange} />,
      renderCell: (row) =>
        row.domain ? (
          CLO_DOMAIN_LABEL_TH[row.domain] || row.domain
        ) : (
          <span className="badge-muted">ยังไม่ระบุ</span>
        ),
    },
    {
      key: "pass_threshold_percent",
      label: "เกณฑ์ผ่าน (%)",
      type: "number",
      min: 0,
      max: 100,
      required: true,
    },
    { key: "plo_codes_display", label: "PLO ที่ผูกไว้", displayOnly: true },
  ];

  return (
    <CrudManager
      title="จัดการ CLO"
      columns={columns}
      api={{ list: listCLOWithPloCodes, create: createCLO, update: updateCLO, remove: deleteCLO }}
    />
  );
}
