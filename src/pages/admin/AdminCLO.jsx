import CrudManager from "../../components/admin/CrudManager.jsx";
import useOptions from "../../hooks/useOptions.js";
import { listCourses, listCLO, createCLO, updateCLO, deleteCLO } from "../../api/client.js";

/**
 * จัดการตาราง CLO (ผลลัพธ์การเรียนรู้ระดับรายวิชา) ผ่าน CrudManager - แต่ละ CLO ผูกกับวิชาหนึ่ง
 * และมีเกณฑ์ผ่าน (%) ของตัวเอง หน้านี้เป็นทางเลือกสำรอง (ปกติสร้าง/แก้ไข CLO ทำผ่านหน้า
 * "จัดการวิชาที่สอน" แทน)
 */
export default function AdminCLO() {
  const courseOptions = useOptions(listCourses, (data) =>
    data.map((c) => ({ value: c.id, label: `${c.course_code} ${c.name_th}` }))
  );

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
