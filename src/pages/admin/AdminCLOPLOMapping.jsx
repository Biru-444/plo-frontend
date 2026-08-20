import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listCLO,
  listPLO,
  listCLOPLOMapping,
  createCLOPLOMapping,
  updateCLOPLOMapping,
  deleteCLOPLOMapping,
} from "../../api/client.js";

export default function AdminCLOPLOMapping() {
  const [cloOptions, setCloOptions] = useState([]);
  const [ploOptions, setPloOptions] = useState([]);

  useEffect(() => {
    listCLO().then((data) =>
      setCloOptions(data.map((c) => ({ value: c.id, label: `${c.code} - ${c.course_id}` })))
    );
    listPLO().then((data) => setPloOptions(data.map((p) => ({ value: p.id, label: p.code }))));
  }, []);

  const columns = [
    { key: "clo_id", label: "CLO", type: "select", options: cloOptions, required: true },
    { key: "plo_id", label: "PLO", type: "select", options: ploOptions, required: true },
    { key: "weight_percent", label: "น้ำหนัก (%)", type: "number", step: "0.01", required: true },
  ];

  return (
    <CrudManager
      title="จัดการ CLO-PLO Mapping"
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
