/**
 * ทำอะไร : หน้าเชื่อมโยง CLO กับ PLO โดยตรง — แทนที่ AdminCoursePLO.jsx (เชื่อมโยงระดับวิชา) เดิม
 *          เพราะสถาปัตยกรรมการคำนวณ % บรรลุ PLO เปลี่ยนจาก "วิชา↔PLO" (course_plo) เป็น "CLO↔PLO"
 *          (clo_plo_mapping) ไปแล้วฝั่ง backend (ดู plo_calculation.py) - หน้า course-plo เดิมจึงไม่ตรง
 *          กับความจริงที่ใช้คำนวณอีกต่อไป (ดู แผนการแก้ไขครั้งใหญ่-PLO-CLO.md Workstream 1 ข้อ 4)
 *
 * เชื่อมกับ : เรียก GET/POST/DELETE /clo-plo-mapping ผ่าน api/client.js (ไม่มี PUT - เป็น pure join
 *             table ไม่มี field ให้แก้นอกจาก clo_id/plo_id เอง ผูกใหม่/ถอดทำผ่าน POST/DELETE เท่านั้น)
 *             route มาจาก App.jsx เส้นทาง "/admin/clo-plo-mapping" (admin เท่านั้น)
 *
 * ถ้าแก้ : ผูก CLO-PLO คู่ใหม่ตอนนี้ยังไม่มีช่องกรอกน้ำหนัก (weight_percent) - จะเพิ่มใน Workstream 3
 *          พร้อม auto-fill เกลี่ยเท่ากันตอนผูกใหม่ ยังไม่ใช่ตอนนี้ - course_plo (หน้าเดิม) ยังไม่ได้ลบทิ้ง
 *          ฝั่ง backend เก็บไว้ใช้แสดง curriculum mapping ระดับหลักสูตรเท่านั้น ไม่ใช้คำนวณแล้ว
 *
 *          crossFieldCheck (Workstream 4) เตือน real-time ตอนเลือกครบทั้ง CLO และ PLO ว่า domain/
 *          category ตรงกันไหม โดยเรียก GET /clo-plo-mapping/domain-check ให้ backend เป็นคนตัดสิน
 *          (pure code-level เทียบ clo.domain กับ plo.category ตรงๆ) ไม่คำนวณเทียบเองฝั่ง frontend
 *          เพื่อไม่ให้ตรรกะเทียบมีสองชุดที่อาจ drift ไม่ตรงกัน (ดู
 *          app/services/domain_category_check.py ฝั่ง backend - ฟังก์ชันเดียวกับที่ Phase 1 ของ
 *          มคอ.3 import ใช้เติม flag "domain_category_mismatch" ด้วย) - ไม่บล็อกการผูกไม่ว่าจะเตือน
 *          หรือไม่
 */
import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listCourses,
  listCLO,
  listPLO,
  listCLOPLOMapping,
  createCLOPLOMapping,
  deleteCLOPLOMapping,
  checkCLOPLODomainMatch,
} from "../../api/client.js";

// ค่าคงที่ระดับโมดูล (ไม่ผูกกับ state/props ใดๆ ของ component) - ส่งเป็น object เดิมทุก render กัน
// useEffect ของ CrudManager ที่ watch prop นี้อยู่ re-run เกินจำเป็นจาก reference ใหม่ทุกครั้ง
const CLO_PLO_CROSS_FIELD_CHECK = {
  watchKeys: ["clo_id", "plo_id"],
  async check(form) {
    const result = await checkCLOPLODomainMatch(form.clo_id, form.plo_id);
    return result.mismatch ? { message: result.message } : null;
  },
};

export default function AdminCLOPLOMapping() {
  // ตัวเลือก CLO/PLO สำหรับ dropdown ในฟอร์ม
  const [cloOptions, setCloOptions] = useState([]);
  const [ploOptions, setPloOptions] = useState([]);

  // โหลดวิชา/CLO/PLO ครั้งเดียวตอนเปิดหน้า - ต้องมีรหัสวิชานำหน้าใน label ของ CLO ด้วย เพราะรหัส CLO
  // (เช่น "CLO1") ซ้ำกันได้ข้ามวิชา ไม่งั้นเลือกผิดวิชากันได้ง่ายมาก
  useEffect(() => {
    listCourses().then((courses) => {
      const courseCodeById = Object.fromEntries(courses.map((c) => [c.id, c.course_code]));
      listCLO().then((clos) =>
        setCloOptions(
          clos.map((c) => ({
            value: c.id,
            label: `${courseCodeById[c.course_id] ?? "?"} ${c.code}: ${c.description}`,
          }))
        )
      );
    });
    listPLO().then((data) => setPloOptions(data.map((p) => ({ value: p.id, label: p.code }))));
  }, []);

  const columns = [
    { key: "clo_id", label: "CLO", type: "searchable-select", options: cloOptions, required: true },
    { key: "plo_id", label: "PLO (ผลลัพธ์ระดับหลักสูตร)", type: "select", options: ploOptions, required: true },
  ];

  return (
    <CrudManager
      title="เชื่อมโยง CLO กับ PLO"
      columns={columns}
      api={{ list: listCLOPLOMapping, create: createCLOPLOMapping, remove: deleteCLOPLOMapping }}
      crossFieldCheck={CLO_PLO_CROSS_FIELD_CHECK}
    />
  );
}
