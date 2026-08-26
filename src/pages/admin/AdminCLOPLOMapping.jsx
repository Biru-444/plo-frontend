import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listCLO,
  listPLO,
  listCourses,
  listCLOPLOMapping,
  createCLOPLOMapping,
  updateCLOPLOMapping,
  deleteCLOPLOMapping,
} from "../../api/client.js";

export default function AdminCLOPLOMapping() {
  const [cloOptions, setCloOptions] = useState([]);
  const [ploOptions, setPloOptions] = useState([]);

  useEffect(() => {
    Promise.all([listCLO(), listCourses()]).then(([clos, courses]) => {
      const courseById = {};
      courses.forEach((c) => (courseById[c.id] = c));
      setCloOptions(
        clos.map((c) => {
          const course = courseById[c.course_id];
          const courseLabel = course ? `${course.course_code} ${course.name_th}` : `วิชา #${c.course_id}`;
          return { value: c.id, label: `${c.code} - ${courseLabel}` };
        })
      );
    });
    listPLO().then((data) => setPloOptions(data.map((p) => ({ value: p.id, label: p.code }))));
  }, []);

  const columns = [
    { key: "clo_id", label: "CLO (ผลลัพธ์ระดับรายวิชา)", type: "select", options: cloOptions, required: true },
    { key: "plo_id", label: "PLO (ผลลัพธ์ระดับหลักสูตร)", type: "select", options: ploOptions, required: true },
    { key: "weight_percent", label: "น้ำหนัก (%)", type: "number", step: "0.01", required: true },
  ];

  return (
    <CrudManager
      title="เชื่อมโยง CLO กับ PLO"
      columns={columns}
      api={{
        list: listCLOPLOMapping,
        create: createCLOPLOMapping,
        update: updateCLOPLOMapping,
        remove: deleteCLOPLOMapping,
      }}
    />
  );
}
