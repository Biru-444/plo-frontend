/**
 * ทำอะไร : หน้าจัดการ PLO (ผลลัพธ์การเรียนรู้ระดับหลักสูตร) — config ตาราง+ฟอร์มให้ CrudManager
 *          รับผิดชอบ UI ทั้งหมด หน้านี้เตรียมแค่ dropdown ตัวเลือกหลักสูตร (curriculumOptions)
 *
 * เชื่อมกับ : เรียก GET/POST/PUT/DELETE /plo ผ่าน api/client.js — route มาจาก App.jsx เส้นทาง
 *             "/admin/plo" (admin เท่านั้น)
 *
 * ถ้าแก้ : ลบ PLO จะ cascade ลบ ylo_plo_mapping และ course_plo ที่อ้างถึง กระทบทั้งการคำนวณ PLO และ
 *          YLO ที่ผูกกับ PLO นี้
 */
import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import { listCurricula, listPLO, createPLO, updatePLO, deletePLO } from "../../api/client.js";

export default function AdminPLO() {
  // ตัวเลือกหลักสูตรสำหรับ dropdown ในฟอร์ม
  const [curriculumOptions, setCurriculumOptions] = useState([]);

  // โหลดรายชื่อหลักสูตรครั้งเดียวตอนเปิดหน้า
  useEffect(() => {
    listCurricula().then((data) =>
      setCurriculumOptions(data.map((c) => ({ value: c.id, label: `${c.name} (${c.year})` })))
    );
  }, []);

  const columns = [
    { key: "curriculum_id", label: "หลักสูตร", type: "select", options: curriculumOptions, required: true },
    { key: "code", label: "รหัส PLO (เช่น PLO1)", type: "text", required: true },
    { key: "description_th", label: "คำอธิบาย (ไทย)", type: "text", required: true },
    { key: "description_en", label: "คำอธิบาย (อังกฤษ)", type: "text", nullable: true },
  ];

  return (
    <CrudManager
      title="จัดการ PLO"
      columns={columns}
      api={{ list: listPLO, create: createPLO, update: updatePLO, remove: deletePLO }}
    />
  );
}
