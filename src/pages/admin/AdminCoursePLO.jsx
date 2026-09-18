import CrudManager from "../../components/admin/CrudManager.jsx";
import useOptions from "../../hooks/useOptions.js";
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

/**
 * จัดการตารางเชื่อมโยงรายวิชากับ PLO (course_plo) ผ่าน CrudManager - นี่คือจุดที่ผูกวิชาเข้ากับ PLO
 * โดยตรง (แทนที่การผูก CLO<->PLO แบบถ่วงน้ำหนักที่เคยมีแล้วถูกรื้อทิ้งไป) responsibility_level บอกว่า
 * วิชานี้เป็นวิชา "หลัก" หรือ "รอง" ของ PLO ข้อนั้น (เฉพาะวิชาหลักเท่านั้นที่ถูกนับตอนคำนวณผลบรรลุ PLO)
 */
export default function AdminCoursePLO() {
  const courseOptions = useOptions(listCourses, (data) =>
    data.map((c) => ({ value: c.id, label: `${c.course_code} ${c.name_th}` }))
  );
  const ploOptions = useOptions(listPLO, (data) => data.map((p) => ({ value: p.id, label: p.code })));

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
