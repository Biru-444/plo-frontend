/**
 * ทำอะไร : หน้าจัดการ CLO (ผลลัพธ์การเรียนรู้ระดับรายวิชา) — config ตาราง+ฟอร์มให้ CrudManager
 *          รับผิดชอบ UI ทั้งหมด หน้านี้เตรียมแค่ dropdown ตัวเลือกรายวิชา (courseOptions)
 *
 * เชื่อมกับ : เรียก GET/POST/PUT/DELETE /clo ผ่าน api/client.js — route มาจาก App.jsx เส้นทาง
 *             "/admin/clo" (admin เท่านั้น — instructor จัดการ CLO ของวิชาตัวเองผ่านช่องทางอื่น)
 *
 * ถ้าแก้ : pass_threshold_percent ที่แก้ที่นี่กระทบการตัดสิน CLO ผ่าน/ไม่ผ่านย้อนหลังทั้งหมดทันที (ดู
 *          app/models/clo.py ฝั่ง backend)
 */
import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import { listCourses, listCLO, createCLO, updateCLO, deleteCLO } from "../../api/client.js";

export default function AdminCLO() {
  // ตัวเลือกรายวิชาสำหรับ dropdown ในฟอร์ม
  const [courseOptions, setCourseOptions] = useState([]);

  // โหลดรายชื่อวิชาครั้งเดียวตอนเปิดหน้า
  useEffect(() => {
    listCourses().then((data) =>
      setCourseOptions(data.map((c) => ({ value: c.id, label: `${c.course_code} ${c.name_th}` })))
    );
  }, []);

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
  ];

  return (
    <CrudManager
      title="จัดการ CLO"
      columns={columns}
      api={{ list: listCLO, create: createCLO, update: updateCLO, remove: deleteCLO }}
    />
  );
}
