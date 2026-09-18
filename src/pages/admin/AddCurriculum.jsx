/**
 * ทำอะไร : หน้าจัดการหลักสูตร (เพิ่ม/แก้ไข/ลบ) — เป็นแค่ config (คอลัมน์ตาราง + ฟังก์ชัน API) ที่ส่งให้
 *          CrudManager component จัดการ UI ตาราง+ฟอร์มให้ทั้งหมด ไม่มี logic ของหน้านี้เอง
 *
 * เชื่อมกับ : เรียก GET/POST/PUT/DELETE /curricula ผ่าน api/client.js — route มาจาก App.jsx เส้นทาง
 *             "/admin/curriculum" (admin เท่านั้น)
 *
 * ถ้าแก้ : เพิ่ม/ลบ column ต้องดูให้ตรงกับ field จริงใน backend (CurriculumCreateSchema/UpdateSchema)
 */
import CrudManager from "../../components/admin/CrudManager.jsx";
import { listCurricula, createCurriculum, updateCurriculum, deleteCurriculum } from "../../api/client.js";

const ACTIVE_OPTIONS = [
  { value: "true", label: "ใช้งานอยู่" },
  { value: "false", label: "ไม่ใช้งาน" },
];

export default function AddCurriculum() {
  const columns = [
    { key: "name", label: "ชื่อหลักสูตร", type: "text", required: true },
    { key: "year", label: "ปีหลักสูตร", type: "number", min: 0, required: true },
    { key: "is_active", label: "สถานะ", type: "select", options: ACTIVE_OPTIONS, required: true },
  ];

  return (
    <CrudManager
      title="จัดการหลักสูตร"
      columns={columns}
      api={{ list: listCurricula, create: createCurriculum, update: updateCurriculum, remove: deleteCurriculum }}
    />
  );
}
