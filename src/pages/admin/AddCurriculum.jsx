import CrudManager from "../../components/admin/CrudManager.jsx";
import { listCurricula, createCurriculum, updateCurriculum, deleteCurriculum } from "../../api/client.js";

const ACTIVE_OPTIONS = [
  { value: "true", label: "ใช้งานอยู่" },
  { value: "false", label: "ไม่ใช้งาน" },
];

/** จัดการตารางหลักสูตร ผ่าน CrudManager - หน้านี้เป็นทางเลือกสำรอง (ปกติเพิ่ม/แก้ไขหลักสูตรทำผ่าน
 * หน้า "หลักสูตร/รายวิชา" แทน) ลบยังต้องทำที่นี่เท่านั้น */
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
