import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listYLO,
  listPLO,
  listYLOPLOMapping,
  createYLOPLOMapping,
  deleteYLOPLOMapping,
} from "../../api/client.js";

export default function AdminYLOPLOMapping() {
  const [yloOptions, setYloOptions] = useState([]);
  const [ploOptions, setPloOptions] = useState([]);

  useEffect(() => {
    listYLO().then((data) =>
      setYloOptions(
        data.map((y) => ({ value: y.id, label: `ปีที่ ${y.year_level} (หลักสูตร #${y.curriculum_id})` }))
      )
    );
    listPLO().then((data) => setPloOptions(data.map((p) => ({ value: p.id, label: p.code }))));
  }, []);

  const columns = [
    { key: "ylo_id", label: "YLO", type: "select", options: yloOptions, required: true },
    { key: "plo_id", label: "PLO", type: "select", options: ploOptions, required: true },
  ];

  return (
    <CrudManager
      title="จัดการ YLO-PLO Mapping"
      columns={columns}
      api={{ list: listYLOPLOMapping, create: createYLOPLOMapping, remove: deleteYLOPLOMapping }}
    />
  );
}
