/**
 * ทำอะไร : หน้าเชื่อมโยงรายวิชากับ PLO — config ตาราง+ฟอร์มให้ CrudManager รับผิดชอบ UI ถือเป็นหน้าที่
 *          สำคัญที่สุดหน้าหนึ่ง เพราะ responsibility_level ('primary'/'secondary') ที่ตั้งค่าที่นี่
 *          คือตัวขับเคลื่อนการคำนวณ % บรรลุ PLO ทั้งระบบ (ดู app/models/course_plo.py ฝั่ง backend)
 *
 * เชื่อมกับ : เรียก GET/POST/PUT/DELETE /course-plo ผ่าน api/client.js — route มาจาก App.jsx
 *             เส้นทาง "/admin/course-plo" (admin เท่านั้น)
 *
 * ถ้าแก้ : เปลี่ยนวิชาจาก 'secondary' เป็น 'primary' (หรือกลับกัน) ทำให้ % บรรลุ PLO ของนักศึกษาทุกคน
 *          เปลี่ยนทันทีที่ query ครั้งถัดไป — ไม่ใช่แค่ค่า config เฉยๆ
 */
import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listCourses,
  listPLO,
  listCoursePLO,
  createCoursePLO,
  updateCoursePLO,
  deleteCoursePLO,
} from "../../api/client.js";

const RESPONSIBILITY_OPTIONS = [
  { value: "primary", label: "หลัก (primary)" },
  { value: "secondary", label: "รอง (secondary)" },
];

export default function AdminCoursePLO() {
  // ตัวเลือกรายวิชา/PLO สำหรับ dropdown ในฟอร์ม
  const [courseOptions, setCourseOptions] = useState([]);
  const [ploOptions, setPloOptions] = useState([]);

  // โหลดรายวิชาและ PLO ครั้งเดียวตอนเปิดหน้า
  useEffect(() => {
    listCourses().then((data) =>
      setCourseOptions(data.map((c) => ({ value: c.id, label: `${c.course_code} ${c.name_th}` })))
    );
    listPLO().then((data) => setPloOptions(data.map((p) => ({ value: p.id, label: p.code }))));
  }, []);

  const columns = [
    { key: "course_id", label: "รายวิชา", type: "searchable-select", options: courseOptions, required: true },
    { key: "plo_id", label: "PLO (ผลลัพธ์ระดับหลักสูตร)", type: "select", options: ploOptions, required: true },
    {
      key: "responsibility_level",
      label: "ระดับความรับผิดชอบ",
      type: "select",
      options: RESPONSIBILITY_OPTIONS,
      required: true,
    },
  ];

  return (
    <CrudManager
      title="เชื่อมโยงรายวิชากับ PLO"
      columns={columns}
      api={{ list: listCoursePLO, create: createCoursePLO, update: updateCoursePLO, remove: deleteCoursePLO }}
    />
  );
}
