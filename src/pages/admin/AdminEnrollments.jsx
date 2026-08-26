import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listStudents,
  listCourseOfferings,
  listCourses,
  listEnrollments,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment,
} from "../../api/client.js";

export default function AdminEnrollments() {
  const [studentOptions, setStudentOptions] = useState([]);
  const [offeringOptions, setOfferingOptions] = useState([]);

  useEffect(() => {
    listStudents().then((data) =>
      setStudentOptions(data.map((s) => ({ value: s.id, label: `${s.id} ${s.first_name} ${s.last_name}` })))
    );
    Promise.all([listCourseOfferings(), listCourses()]).then(([offerings, courses]) => {
      const courseById = {};
      courses.forEach((c) => (courseById[c.id] = c));
      setOfferingOptions(
        offerings.map((o) => {
          const course = courseById[o.course_id];
          const courseLabel = course ? `${course.course_code} ${course.name_th}` : `วิชา #${o.course_id}`;
          return {
            value: o.id,
            label: `${courseLabel} · ภาคเรียน ${o.semester}/${o.academic_year} หมู่ ${o.section}`,
          };
        })
      );
    });
  }, []);

  const columns = [
    { key: "student_id", label: "นักศึกษา", type: "select", options: studentOptions, required: true },
    { key: "offering_id", label: "วิชาที่เปิดสอน", type: "select", options: offeringOptions, required: true },
    { key: "final_grade", label: "เกรด", type: "text", nullable: true },
  ];

  return (
    <CrudManager
      title="จัดการการลงทะเบียนเรียน"
      columns={columns}
      api={{ list: listEnrollments, create: createEnrollment, update: updateEnrollment, remove: deleteEnrollment }}
    />
  );
}
