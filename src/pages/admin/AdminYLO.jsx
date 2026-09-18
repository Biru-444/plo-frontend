/**
 * ทำอะไร : หน้าจัดการ YLO (ผลลัพธ์การเรียนรู้ระดับชั้นปี) — config ตาราง+ฟอร์มให้ CrudManager
 *          รับผิดชอบ UI ทั้งหมด หน้านี้เตรียมแค่ dropdown ตัวเลือกหลักสูตร (curriculumOptions)
 *
 * เชื่อมกับ : เรียก GET/POST/PUT/DELETE /ylo ผ่าน api/client.js — route มาจาก App.jsx เส้นทาง
 *             "/admin/ylo" (admin เท่านั้น)
 *
 * ถ้าแก้ : ลบ YLO จะ cascade ลบ ylo_plo_mapping ที่อ้างถึง กระทบการคำนวณ % บรรลุ YLO ปีนั้นทันที (ดู
 *          app/models/ylo.py ฝั่ง backend)
 */
import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import { listCurricula, listYLO, createYLO, updateYLO, deleteYLO } from "../../api/client.js";

export default function AdminYLO() {
  // ตัวเลือกหลักสูตรสำหรับ dropdown ในฟอร์ม (สร้างเป็น {value, label} ให้ CrudManager render เอง)
  const [curriculumOptions, setCurriculumOptions] = useState([]);

  // โหลดรายชื่อหลักสูตรครั้งเดียวตอนเปิดหน้า (ไม่ re-run ตามการกระทำใดๆ ในตาราง)
  useEffect(() => {
    listCurricula().then((data) =>
      setCurriculumOptions(data.map((c) => ({ value: c.id, label: `${c.name} (${c.year})` })))
    );
  }, []);

  const columns = [
    { key: "curriculum_id", label: "หลักสูตร", type: "select", options: curriculumOptions, required: true },
    { key: "year_level", label: "ชั้นปี", type: "number", min: 1, required: true, filterable: true },
    { key: "description", label: "คำอธิบาย", type: "text", required: true },
  ];

  return (
    <CrudManager
      title="จัดการ YLO"
      columns={columns}
      api={{ list: listYLO, create: createYLO, update: updateYLO, remove: deleteYLO }}
    />
  );
}
