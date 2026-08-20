import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listCourses,
  listUsers,
  listCourseOfferings,
  createCourseOffering,
  updateCourseOffering,
  deleteCourseOffering,
} from "../../api/client.js";

export default function AdminCourseOffering() {
  const [courseOptions, setCourseOptions] = useState([]);
  const [instructorOptions, setInstructorOptions] = useState([]);

  useEffect(() => {
    listCourses().then((data) =>
      setCourseOptions(data.map((c) => ({ value: c.id, label: `${c.course_code} ${c.name_th}` })))
    );
    listUsers().then((data) =>
      setInstructorOptions(
        data
          .filter((u) => u.role === "instructor")
          .map((u) => ({ value: u.id, label: `${u.first_name} ${u.last_name} (${u.username})` }))
      )
    );
  }, []);

  const columns = [
    { key: "course_id", label: "รายวิชา", type: "select", options: courseOptions, required: true },
    { key: "instructor_id", label: "ผู้สอน", type: "select", options: instructorOptions, required: true },
    { key: "cohort_year", label: "รุ่นปีเข้า (cohort_year)", type: "number", nullable: true },
    { key: "academic_year", label: "ปีการศึกษา (academic_year)", type: "number", required: true },
    { key: "semester", label: "ภาคเรียน (semester)", type: "number", required: true },
    { key: "section", label: "หมู่เรียน (section)", type: "text", required: true },
  ];

  return (
    <CrudManager
      title="จัดการการเปิดสอนรายวิชา (Course Offering)"
      columns={columns}
      api={{
        list: listCourseOfferings,
        create: createCourseOffering,
        update: updateCourseOffering,
        remove: deleteCourseOffering,
      }}
    />
  );
}
