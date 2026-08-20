import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listAssessmentItems,
  listCLO,
  listItemCLO,
  createItemCLO,
  updateItemCLO,
  deleteItemCLO,
} from "../../api/client.js";

export default function AdminItemCLO() {
  const [itemOptions, setItemOptions] = useState([]);
  const [cloOptions, setCloOptions] = useState([]);

  useEffect(() => {
    listAssessmentItems().then((data) =>
      setItemOptions(data.map((i) => ({ value: i.id, label: i.name })))
    );
    listCLO().then((data) => setCloOptions(data.map((c) => ({ value: c.id, label: c.code }))));
  }, []);

  const columns = [
    { key: "item_id", label: "งานประเมิน", type: "select", options: itemOptions, required: true },
    { key: "clo_id", label: "CLO", type: "select", options: cloOptions, required: true },
    { key: "weight_percent", label: "น้ำหนัก (%)", type: "number", step: "0.01", required: true },
  ];

  return (
    <CrudManager
      title="จัดการ Item-CLO Mapping"
      columns={columns}
      api={{ list: listItemCLO, create: createItemCLO, update: updateItemCLO, remove: deleteItemCLO }}
    />
  );
}
