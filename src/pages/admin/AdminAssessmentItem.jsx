import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listCourseOfferings,
  listAssessmentItems,
  createAssessmentItem,
  updateAssessmentItem,
  deleteAssessmentItem,
} from "../../api/client.js";

const TYPE_OPTIONS = [
  { value: "quiz", label: "quiz" },
  { value: "midterm", label: "midterm" },
  { value: "final", label: "final" },
  { value: "assignment", label: "assignment" },
  { value: "project", label: "project" },
];

export default function AdminAssessmentItem() {
  const [offeringOptions, setOfferingOptions] = useState([]);

  useEffect(() => {
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
    { key: "offering_id", label: "การเปิดสอน", type: "select", options: offeringOptions, required: true },
    { key: "name", label: "ชื่องาน", type: "text", required: true },
    { key: "type", label: "ประเภท", type: "select", options: TYPE_OPTIONS, required: true },
    { key: "total_score", label: "คะแนนเต็ม", type: "number", step: "0.01", required: true },
  ];

  return (
    <CrudManager
      title="จัดการงานประเมิน (Assessment Item)"
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
