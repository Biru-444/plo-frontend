import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import useOptions from "../../hooks/useOptions.js";
import {
  listYLO,
  listPLO,
  listCurricula,
  listYLOPLOMapping,
  createYLOPLOMapping,
  deleteYLOPLOMapping,
} from "../../api/client.js";

/** จัดการตารางเชื่อมโยง YLO กับ PLO (ylo_plo_mapping) ผ่าน CrudManager - ไม่มีปุ่มแก้ไข มีแค่เพิ่ม/ลบ */
export default function AdminYLOPLOMapping() {
  const [yloOptions, setYloOptions] = useState([]);
  const ploOptions = useOptions(listPLO, (data) => data.map((p) => ({ value: p.id, label: p.code })));

  // ตัวเลือก YLO ต้อง join ชื่อหลักสูตรมาด้วย (ไม่ใช่แค่ปีที่) ไม่งั้นแยกไม่ออกว่า "ปีที่ 1" ของ
  // หลักสูตรไหนถ้ามีหลายหลักสูตร - รูปข้อมูลนี้ประกอบจาก 2 endpoint (listYLO + listCurricula) จึงเขียน
  // แยกจาก useOptions ทั่วไป (ที่รองรับแค่ 1 endpoint ต่อครั้ง) ไม่ใช้ hook ร่วมกับ ploOptions ด้านบน
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
