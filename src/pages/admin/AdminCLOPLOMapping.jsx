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
 * ถ้าแก้ : ผูก CLO-PLO คู่ใหม่ - weight_percent auto-fill เกลี่ยเท่ากันเองฝั่ง backend เสมอ (ไม่มีช่อง
 *          กรอกตอน "เพิ่ม" เลย ดู columns ด้านล่าง - editOnly: true) แก้ทีหลังได้ผ่านปุ่ม "แก้ไข" (PUT
 *          /clo-plo-mapping/{id} - ไม่ trigger การเกลี่ยของคู่อื่นของ CLO เดียวกัน) clo_id/plo_id เป็น
 *          readOnly ตอนแก้ไข (เปลี่ยนคู่ทำผ่านลบ+สร้างใหม่ ไม่ใช่แก้ - ดู
 *          CLOPLOMappingUpdateSchema ฝั่ง backend ที่มีแค่ weight_percent field เดียว) course_plo
 *          (หน้าเดิม) ยังไม่ได้ลบทิ้ง ฝั่ง backend เก็บไว้ใช้แสดง curriculum mapping ระดับหลักสูตรเท่านั้น
 *          ไม่ใช้คำนวณแล้ว
 *
 *          crossFieldCheck (Workstream 4) เตือน real-time ตอนเลือกครบทั้ง CLO และ PLO ว่า domain/
 *          category ตรงกันไหม โดยเรียก GET /clo-plo-mapping/domain-check ให้ backend เป็นคนตัดสิน
 *          (pure code-level เทียบ clo.domain กับ plo.category ตรงๆ) ไม่คำนวณเทียบเองฝั่ง frontend
 *          เพื่อไม่ให้ตรรกะเทียบมีสองชุดที่อาจ drift ไม่ตรงกัน (ดู
 *          app/services/domain_category_check.py ฝั่ง backend - ฟังก์ชันเดียวกับที่ Phase 1 ของ
 *          มคอ.3 import ใช้เติม flag "domain_category_mismatch" ด้วย) - ไม่บล็อกการผูกไม่ว่าจะเตือน
 *          หรือไม่ - ข้อความที่ประกอบเป็นภาษาไทยเอง (ใช้ CLO_DOMAIN_LABEL_TH แค่แปลชื่อ domain ให้อ่านง่าย
 *          ในกล่องยืนยัน ไม่ใช่ตัวตัดสิน mismatch - ตัวตัดสินยังมาจาก result.mismatch ของ backend เท่านั้น)
 *
 *          ต่อยอดจากคำเตือน inline เดิม (Workstream 4) ด้วยกล่องยืนยันแบบ block (requireConfirmOnWarning
 *          ของ CrudManager) ตามที่ผู้ใช้ขอ 2026-09-27 - ผูกได้ 1 คู่ CLO-PLO ต่อคำขอเท่านั้น (ฟอร์มนี้ไม่มี
 *          multi-select PLO) จึงไม่ต้องรวมหลายคู่ไว้ในกล่องเดียว - คอลัมน์ "ตรวจสอบประเภท" ท้ายตาราง
 *          แสดงป้ายเตือนของคู่ที่ผูกไว้แล้วที่ไม่ตรงกัน (เรียก domain-check ต่อแถวหลังโหลดตาราง)
 */
import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listCourses,
  listCLO,
  listPLO,
  listCLOPLOMapping,
  createCLOPLOMapping,
  updateCLOPLOMapping,
  deleteCLOPLOMapping,
  checkCLOPLODomainMatch,
} from "../../api/client.js";
import { CLO_DOMAIN_LABEL_TH } from "../../utils/cloDomain.js";

// เก็บ CLO/PLO เต็มๆ (ไม่ใช่แค่ตัวเลือก dropdown) ไว้นอก component เพื่อให้ CLO_PLO_CROSS_FIELD_CHECK
// (ค่าคงที่ระดับโมดูล - ต้อง reference เดิมทุก render กัน useEffect ของ CrudManager re-run เกินจำเป็น)
// เข้าถึง domain/category ปัจจุบันได้ตอนประกอบข้อความกล่องยืนยัน - AdminCLOPLOMapping() เติมค่านี้เองตอน
// โหลดหน้า
let cloById = {};
let ploById = {};

const CLO_PLO_CROSS_FIELD_CHECK = {
  watchKeys: ["clo_id", "plo_id"],
  requireConfirmOnWarning: true,
  confirmTitle: "ประเภทไม่ตรงกัน",
  confirmLabel: "เชื่อมต่อ",
  cancelLabel: "ยกเลิก",
  async check(form) {
    const result = await checkCLOPLODomainMatch(form.clo_id, form.plo_id);
    if (!result.mismatch) return null;
    const clo = cloById[form.clo_id];
    const plo = ploById[form.plo_id];
    const cloLabel = clo ? `${clo.code} (${CLO_DOMAIN_LABEL_TH[clo.domain] || clo.domain})` : "CLO นี้";
    const ploLabel = plo ? `${plo.code} (${plo.category})` : "PLO นี้";
    return {
      message: `${cloLabel} กำลังจะเชื่อมกับ ${ploLabel} ซึ่งเป็นคนละประเภท ต้องการเชื่อมต่อหรือไม่?`,
    };
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
      listCLO().then((clos) => {
        cloById = Object.fromEntries(clos.map((c) => [c.id, c]));
        setCloOptions(
          clos.map((c) => ({
            value: c.id,
            label: `${courseCodeById[c.course_id] ?? "?"} ${c.code}: ${c.description}`,
          }))
        );
      });
    });
    listPLO().then((data) => {
      ploById = Object.fromEntries(data.map((p) => [p.id, p]));
      setPloOptions(data.map((p) => ({ value: p.id, label: p.code })));
    });
  }, []);

  // แทน listCLOPLOMapping() ตรงๆ ด้วยตัวที่เรียก domain-check ต่อแถวเพิ่ม (จำนวนคู่ที่ผูกไว้ต่อหลักสูตร
  // ไม่เยอะ - หน้านี้เป็นแอดมินเท่านั้น) เพื่อเติม mismatch: bool ต่อแถวสำหรับป้ายเตือนในตาราง โดยไม่เขียน
  // ตรรกะเทียบเอง (เรียก endpoint เดิมของเพื่อนซ้ำต่อคู่แทน)
  async function listCLOPLOMappingWithMismatch() {
    const mappings = await listCLOPLOMapping();
    const results = await Promise.all(
      mappings.map((m) =>
        checkCLOPLODomainMatch(m.clo_id, m.plo_id).catch(() => ({ mismatch: false }))
      )
    );
    return mappings.map((m, i) => ({ ...m, mismatch: results[i].mismatch }));
  }

  const columns = [
    {
      key: "clo_id",
      label: "CLO",
      type: "searchable-select",
      options: cloOptions,
      required: true,
      readOnly: true, // เปลี่ยนคู่ทำผ่านลบ+สร้างใหม่ ไม่ใช่แก้ไข
    },
    {
      key: "plo_id",
      label: "PLO (ผลลัพธ์ระดับหลักสูตร)",
      type: "select",
      options: ploOptions,
      required: true,
      readOnly: true,
    },
    {
      key: "weight_percent",
      label: "น้ำหนัก (%)",
      type: "number",
      decimal: true,
      min: 0.01,
      max: 100,
      required: true,
      editOnly: true, // ไม่มีช่องกรอกตอน "เพิ่ม" เลย - backend auto-fill เกลี่ยเท่ากันเองเสมอ
    },
    {
      key: "mismatch",
      label: "ตรวจสอบประเภท",
      displayOnly: true,
      renderCell: (row) =>
        row.mismatch ? (
          <span className="roster-badge roster-badge-orange">ประเภทไม่ตรงกัน</span>
        ) : (
          ""
        ),
    },
  ];

  return (
    <CrudManager
      title="เชื่อมโยง CLO กับ PLO"
      columns={columns}
      api={{
        list: listCLOPLOMappingWithMismatch,
        create: createCLOPLOMapping,
        update: updateCLOPLOMapping,
        remove: deleteCLOPLOMapping,
      }}
      crossFieldCheck={CLO_PLO_CROSS_FIELD_CHECK}
    />
  );
}
