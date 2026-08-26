import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listYLO,
  listPLO,
  listCurricula,
  listYLOPLOMapping,
  createYLOPLOMapping,
  deleteYLOPLOMapping,
} from "../../api/client.js";

export default function AdminYLOPLOMapping() {
  const [yloOptions, setYloOptions] = useState([]);
  const [ploOptions, setPloOptions] = useState([]);

  useEffect(() => {
    Promise.all([listYLO(), listCurricula()]).then(([ylos, curricula]) => {
      const curriculumById = {};
      curricula.forEach((c) => (curriculumById[c.id] = c));
      setYloOptions(
        ylos.map((y) => {
          const curriculum = curriculumById[y.curriculum_id];
          const curriculumLabel = curriculum
            ? `${curriculum.name} (${curriculum.year})`
            : `หลักสูตร #${y.curriculum_id}`;
          return { value: y.id, label: `ปีที่ ${y.year_level} - ${curriculumLabel}` };
        })
      );
    });
    listPLO().then((data) => setPloOptions(data.map((p) => ({ value: p.id, label: p.code }))));
  }, []);

  const columns = [
    { key: "ylo_id", label: "YLO (ผลลัพธ์ระดับชั้นปี)", type: "select", options: yloOptions, required: true },
    { key: "plo_id", label: "PLO (ผลลัพธ์ระดับหลักสูตร)", type: "select", options: ploOptions, required: true },
  ];

  return (
    <CrudManager
      title="เชื่อมโยง YLO กับ PLO"
      columns={columns}
      api={{ list: listYLOPLOMapping, create: createYLOPLOMapping, remove: deleteYLOPLOMapping }}
    />
  );
}
