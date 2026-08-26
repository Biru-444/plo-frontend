import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import { listCurricula, listCourses, createCourse, updateCourse, deleteCourse } from "../../api/client.js";

export default function AdminCourse() {
  const [curriculumOptions, setCurriculumOptions] = useState([]);

  useEffect(() => {
    listCurricula().then((data) =>
      setCurriculumOptions(data.map((c) => ({ value: c.id, label: `${c.name} (${c.year})` })))
    );
  }, []);

  const columns = [
    { key: "curriculum_id", label: "หลักสูตร", type: "select", options: curriculumOptions, required: true },
    { key: "course_code", label: "รหัสวิชา", type: "text", required: true },
    { key: "name_th", label: "ชื่อวิชา (ไทย)", type: "text", required: true },
    { key: "name_en", label: "ชื่อวิชา (อังกฤษ)", type: "text", nullable: true },
    { key: "credit", label: "หน่วยกิต", type: "number", required: true },
    { key: "category", label: "หมวดวิชา", type: "text", nullable: true, filterable: true },
  ];

  return (
    <CrudManager
      title="จัดการรายวิชา"
      columns={columns}
      api={{ list: listCourses, create: createCourse, update: updateCourse, remove: deleteCourse }}
    />
  );
}
