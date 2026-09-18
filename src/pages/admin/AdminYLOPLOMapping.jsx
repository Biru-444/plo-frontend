/**
 * ทำอะไร : หน้าเชื่อมโยง YLO กับ PLO (สร้าง/ลบคู่ mapping — ไม่มีแก้ไข เพราะ mapping มีแค่คู่
 *          ylo_id/plo_id) config ตาราง+ฟอร์มให้ CrudManager รับผิดชอบ UI
 *
 * เชื่อมกับ : เรียก GET/POST/DELETE /ylo-plo-mapping ผ่าน api/client.js — route มาจาก App.jsx
 *             เส้นทาง "/admin/ylo-plo-mapping" (admin เท่านั้น)
 *
 * ถ้าแก้ : คู่ที่เพิ่ม/ลบที่นี่มีผลโดยตรงต่อ "PLO กลุ่มที่ YLO ปีนั้นต้องพึ่งพา" กระทบ % บรรลุ YLO
 *          ทั้งรุ่นทันที (ดู _build_ylo_requirements ใน ylo_calculation.py ฝั่ง backend)
 */
import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listYLO,
  listPLO,
  listCurricula,
  listYLOPLOMapping,
  createYLOPLOMapping,
  deleteYLOPLOMapping,
} from "../../api/client.js";

export default function AdminYLOPLOMapping() {
  // ตัวเลือก YLO/PLO สำหรับ dropdown ในฟอร์ม
  const [yloOptions, setYloOptions] = useState([]);
  const [ploOptions, setPloOptions] = useState([]);

  // โหลด YLO (พร้อมชื่อหลักสูตรประกอบ label) และ PLO ครั้งเดียวตอนเปิดหน้า
  useEffect(() => {
    Promise.all([listYLO(), listCurricula()]).then(([ylos, curricula]) => {
      const curriculumById = {};
      curricula.forEach((c) => (curriculumById[c.id] = c));
      setYloOptions(
        ylos.map((y) => {
          const curriculum = curriculumById[y.curriculum_id];
          const curriculumLabel = curriculum
            ? `${curriculum.name} (${curriculum.year})`
            : `หลักสูตร #${y.curriculum_id}`;
          return { value: y.id, label: `ปีที่ ${y.year_level} - ${curriculumLabel}` };
        })
      );
    });
    listPLO().then((data) => setPloOptions(data.map((p) => ({ value: p.id, label: p.code }))));
  }, []);

  const columns = [
    { key: "ylo_id", label: "YLO (ผลลัพธ์ระดับชั้นปี)", type: "select", options: yloOptions, required: true },
    { key: "plo_id", label: "PLO (ผลลัพธ์ระดับหลักสูตร)", type: "select", options: ploOptions, required: true },
  ];

  return (
    <CrudManager
      title="เชื่อมโยง YLO กับ PLO"
      columns={columns}
      api={{ list: listYLOPLOMapping, create: createYLOPLOMapping, remove: deleteYLOPLOMapping }}
    />
  );
}
