import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listStudents,
  listCourseOfferings,
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
    listCourseOfferings().then((data) =>
      setOfferingOptions(
        data.map((o) => ({
          value: o.id,
          label: `offering #${o.id} (course ${o.course_id}, ${o.academic_year}/${o.semester})`,
        }))
      )
    );
  }, []);

  const columns = [
    { key: "student_id", label: "นักศึกษา", type: "select", options: studentOptions, required: true },
    { key: "offering_id", label: "การเปิดสอน", type: "select", options: offeringOptions, required: true },
    { key: "final_grade", label: "เกรด", type: "text", nullable: true },
  ];

  return (
    <CrudManager
      title="จัดการการลงทะเบียน (Enrollment)"
      columns={columns}
      api={{ list: listEnrollments, create: createEnrollment, update: updateEnrollment, remove: deleteEnrollment }}
    />
  );
}
