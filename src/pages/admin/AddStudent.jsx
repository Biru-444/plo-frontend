import CrudManager from "../../components/admin/CrudManager.jsx";
import useOptions from "../../hooks/useOptions.js";
import { listCurricula, listStudents, createStudent, updateStudent, deleteStudent } from "../../api/client.js";

/**
 * จัดการตารางนักศึกษา ผ่าน CrudManager - รหัสนักศึกษา (id) เป็น primary key ที่ตั้งได้ตอนสร้างครั้งเดียว
 * (readOnly ตอนแก้ไข), คำนำหน้า/สถานะการศึกษาเป็นตัวเลือกตายตัว (ไม่ใช่ text อิสระ)
 */
export default function AddStudent() {
  const curriculumOptions = useOptions(listCurricula, (data) =>
    data.map((c) => ({ value: c.id, label: `${c.name} (${c.year})` }))
  );

  const columns = [
    { key: "id", label: "รหัสนักศึกษา", type: "text", required: true, readOnly: true },
    { key: "curriculum_id", label: "หลักสูตร", type: "select", options: curriculumOptions, required: true },
    { key: "first_name", label: "ชื่อ", type: "text", required: true },
    { key: "last_name", label: "นามสกุล", type: "text", required: true },
    {
      key: "title",
      label: "คำนำหน้า",
      type: "select",
      nullable: true,
      options: [
        { value: "นาย", label: "นาย" },
        { value: "นางสาว", label: "นางสาว" },
        { value: "นาง", label: "นาง" },
      ],
    },
    {
      key: "status",
      label: "สถานะการศึกษา",
      type: "select",
      required: true,
      options: [
        { value: "กำลังศึกษา", label: "กำลังศึกษา" },
        { value: "ลาออก", label: "ลาออก" },
        { value: "พักการเรียน", label: "พักการเรียน" },
        { value: "จบการศึกษา", label: "จบการศึกษา" },
      ],
    },
    { key: "cohort_year", label: "ปีที่เข้าศึกษา", type: "number", min: 0, required: true, filterable: true },
    {
      key: "current_year_level",
      label: "ชั้นปีปัจจุบัน",
      type: "number",
      min: 1,
      required: true,
      filterable: true,
    },
    { key: "section", label: "หมู่", type: "text", nullable: true, filterable: true },
  ];

  return (
    <CrudManager
      title="จัดการนักศึกษา"
      columns={columns}
      api={{ list: listStudents, create: createStudent, update: updateStudent, remove: deleteStudent }}
    />
  );
}
