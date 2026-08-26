import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listCourseOfferings,
  listCourses,
  listAssessmentItems,
  createAssessmentItem,
  updateAssessmentItem,
  deleteAssessmentItem,
} from "../../api/client.js";

const TYPE_OPTIONS = [
  { value: "quiz", label: "แบบทดสอบย่อย (Quiz)" },
  { value: "midterm", label: "สอบกลางภาค (Midterm)" },
  { value: "final", label: "สอบปลายภาค (Final)" },
  { value: "assignment", label: "งานที่มอบหมาย (Assignment)" },
  { value: "project", label: "โปรเจกต์ (Project)" },
];

export default function AdminAssessmentItem() {
  const [offeringOptions, setOfferingOptions] = useState([]);

  useEffect(() => {
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
    { key: "offering_id", label: "วิชาที่เปิดสอน", type: "select", options: offeringOptions, required: true },
    { key: "name", label: "ชื่องาน", type: "text", required: true },
    { key: "type", label: "ประเภท", type: "select", options: TYPE_OPTIONS, required: true },
    { key: "total_score", label: "คะแนนเต็ม", type: "number", step: "0.01", required: true },
  ];

  return (
    <CrudManager
      title="จัดการงานประเมิน"
      columns={columns}
      api={{
        list: listAssessmentItems,
        create: createAssessmentItem,
        update: updateAssessmentItem,
        remove: deleteAssessmentItem,
      }}
    />
  );
}
