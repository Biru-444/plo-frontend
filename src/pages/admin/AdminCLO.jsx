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
