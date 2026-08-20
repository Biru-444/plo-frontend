import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import { listCourses, listCLO, createCLO, updateCLO, deleteCLO } from "../../api/client.js";

export default function AdminCLO() {
  const [courseOptions, setCourseOptions] = useState([]);

  useEffect(() => {
    listCourses().then((data) =>
      setCourseOptions(data.map((c) => ({ value: c.id, label: `${c.course_code} ${c.name_th}` })))
    );
  }, []);

  const columns = [
    { key: "course_id", label: "รายวิชา", type: "select", options: courseOptions, required: true },
    { key: "code", label: "รหัส CLO (เช่น CLO1)", type: "text", required: true },
    { key: "description", label: "คำอธิบาย", type: "text", required: true },
    {
      key: "pass_threshold_percent",
      label: "เกณฑ์ผ่าน (%)",
      type: "number",
      step: "0.01",
      required: true,
    },
  ];

  return (
    <CrudManager
      title="จัดการ CLO"
      columns={columns}
      api={{ list: listCLO, create: createCLO, update: updateCLO, remove: deleteCLO }}
    />
  );
}
