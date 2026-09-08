import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import { listCurricula, listYLO, createYLO, updateYLO, deleteYLO } from "../../api/client.js";

export default function AdminYLO() {
  const [curriculumOptions, setCurriculumOptions] = useState([]);

  useEffect(() => {
    listCurricula().then((data) =>
      setCurriculumOptions(data.map((c) => ({ value: c.id, label: `${c.name} (${c.year})` })))
    );
  }, []);

  const columns = [
    { key: "curriculum_id", label: "หลักสูตร", type: "select", options: curriculumOptions, required: true },
    { key: "year_level", label: "ชั้นปี", type: "number", min: 1, required: true, filterable: true },
    { key: "description", label: "คำอธิบาย", type: "text", required: true },
  ];

  return (
    <CrudManager
      title="จัดการ YLO"
      columns={columns}
      api={{ list: listYLO, create: createYLO, update: updateYLO, remove: deleteYLO }}
    />
  );
}
