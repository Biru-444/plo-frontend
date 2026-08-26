import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import { listCurricula, listStudents, createStudent, updateStudent, deleteStudent } from "../../api/client.js";

export default function AddStudent() {
  const [curriculumOptions, setCurriculumOptions] = useState([]);

  useEffect(() => {
    listCurricula().then((data) =>
      setCurriculumOptions(data.map((c) => ({ value: c.id, label: `${c.name} (${c.year})` })))
    );
  }, []);

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
    { key: "cohort_year", label: "ปีที่เข้าศึกษา (cohort year)", type: "number", required: true, filterable: true },
    { key: "current_year_level", label: "ชั้นปีปัจจุบัน", type: "number", required: true, filterable: true },
  ];

  return (
    <CrudManager
      title="จัดการนักศึกษา"
      columns={columns}
      api={{ list: listStudents, create: createStudent, update: updateStudent, remove: deleteStudent }}
    />
  );
}
