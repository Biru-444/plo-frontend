import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import { listCurricula, listPLO, createPLO, updatePLO, deletePLO } from "../../api/client.js";

export default function AdminPLO() {
  const [curriculumOptions, setCurriculumOptions] = useState([]);

  useEffect(() => {
    listCurricula().then((data) =>
      setCurriculumOptions(data.map((c) => ({ value: c.id, label: `${c.name} (${c.year})` })))
    );
  }, []);

  const columns = [
    { key: "curriculum_id", label: "หลักสูตร", type: "select", options: curriculumOptions, required: true },
    { key: "code", label: "รหัส PLO (เช่น PLO1)", type: "text", required: true },
    { key: "description_th", label: "คำอธิบาย (ไทย)", type: "text", required: true },
    { key: "description_en", label: "คำอธิบาย (อังกฤษ)", type: "text", nullable: true },
  ];

  return (
    <CrudManager
      title="จัดการ PLO"
      columns={columns}
      api={{ list: listPLO, create: createPLO, update: updatePLO, remove: deletePLO }}
    />
  );
}
