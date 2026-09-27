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
 *
 *          เลือกหลักสูตรก่อนเสมอ (2026-09-27) - CLO/PLO เดิมโหลดมาทั้งระบบแล้วกรองด้วย useMemo ฝั่ง
 *          client (ไม่ยิง endpoint ใหม่ - PLO มี curriculum_id ตรงตัวอยู่แล้ว, CLO derive ผ่าน
 *          course.curriculum_id) จำหลักสูตรที่เลือกไว้ใน URL (?curriculum=) แบบเดียวกับ PLODashboard.jsx
 *          - <CrudManager key={selectedCurriculumId}> บังคับ remount ทุกครั้งที่เปลี่ยนหลักสูตร (โหลด
 *          ตาราง/เคลียร์ฟอร์มค้างใหม่ทั้งหมด) แทนการแก้ CrudManager.jsx ให้รองรับ reload จาก prop
 *          ภายนอก (ไฟล์นั้นใช้ร่วมกับหน้าแอดมินอื่นอีกหลายหน้า ไม่อยากแก้พฤติกรรมกลาง)
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listCourses,
  listCurricula,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCurriculumId = searchParams.get("curriculum")
    ? Number(searchParams.get("curriculum"))
    : null;

  const [curricula, setCurricula] = useState([]);
  // ข้อมูลดิบทั้งระบบ (ไม่กรองหลักสูตร) โหลดครั้งเดียวตอนเปิดหน้า - cloOptions/ploOptions ด้านล่างกรอง
  // ด้วย useMemo จากชุดนี้อีกที ไม่ยิง endpoint ใหม่ทุกครั้งที่เปลี่ยนหลักสูตร
  const [courses, setCourses] = useState([]);
  const [clos, setClos] = useState([]);
  const [plos, setPlos] = useState([]);

  useEffect(() => {
    listCurricula().then((data) => {
      setCurricula(data);
      // มีหลักสูตรเดียว - เลือกให้อัตโนมัติเลย (ไม่ต้องให้ผู้ใช้กดเอง)
      if (data.length === 1 && !searchParams.get("curriculum")) {
        setSearchParams({ curriculum: String(data[0].id) }, { replace: true });
      }
    });
    listCourses().then(setCourses);
    listCLO().then((data) => {
      cloById = Object.fromEntries(data.map((c) => [c.id, c]));
      setClos(data);
    });
    listPLO().then((data) => {
      ploById = Object.fromEntries(data.map((p) => [p.id, p]));
      setPlos(data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectCurriculum(curriculumId) {
    setSearchParams({ curriculum: String(curriculumId) });
  }

  const courseCurriculumById = useMemo(
    () => Object.fromEntries(courses.map((c) => [c.id, c.curriculum_id])),
    [courses]
  );
  const courseCodeById = useMemo(
    () => Object.fromEntries(courses.map((c) => [c.id, c.course_code])),
    [courses]
  );

  // ตัวเลือก CLO/PLO สำหรับ dropdown ในฟอร์ม - กรองเฉพาะของหลักสูตรที่เลือกอยู่เท่านั้น (ยังต้องมีรหัสวิชา
  // นำหน้าใน label ของ CLO เหมือนเดิม เพราะรหัส CLO เช่น "CLO1" ซ้ำกันได้ข้ามวิชา)
  const cloOptions = useMemo(
    () =>
      clos
        .filter((c) => courseCurriculumById[c.course_id] === selectedCurriculumId)
        .map((c) => ({
          value: c.id,
          label: `${courseCodeById[c.course_id] ?? "?"} ${c.code}: ${c.description}`,
        })),
    [clos, courseCurriculumById, courseCodeById, selectedCurriculumId]
  );
  // "รหัส · คำอธิบายสั้น (ประเภท)" เช่น "PLO1 · ทดสอบ PLO1 (ความรู้)" ตามที่ผู้ใช้ระบุ - ใช้ label เดียวกัน
  // ทั้งฟอร์มเพิ่ม/แก้, ตัวกรองด้านบนตาราง และคอลัมน์ในตาราง (ทั้ง 3 ที่ใช้ options ชุดนี้ร่วมกันใน CrudManager)
  const ploOptions = useMemo(
    () =>
      plos
        .filter((p) => p.curriculum_id === selectedCurriculumId)
        .map((p) => ({ value: p.id, label: `${p.code} · ${p.description_th} (${p.category})` })),
    [plos, selectedCurriculumId]
  );

  const selectedCurriculum = curricula.find((c) => c.id === selectedCurriculumId) ?? null;
  const pageTitle = selectedCurriculum
    ? `เชื่อมโยง CLO กับ PLO (${selectedCurriculum.name} (${selectedCurriculum.year}))`
    : "เชื่อมโยง CLO กับ PLO";

  // แทน listCLOPLOMapping() ตรงๆ ด้วยตัวที่กรองเฉพาะคู่ที่ PLO อยู่ในหลักสูตรที่เลือก แล้วเรียก
  // domain-check ต่อแถวเพิ่ม (จำนวนคู่ที่ผูกไว้ต่อหลักสูตรไม่เยอะ - หน้านี้เป็นแอดมินเท่านั้น) เพื่อเติม
  // mismatch: bool ต่อแถวสำหรับป้ายเตือนในตาราง โดยไม่เขียนตรรกะเทียบเอง (เรียก endpoint เดิมของเพื่อนซ้ำ
  // ต่อคู่แทน)
  async function listCLOPLOMappingWithMismatch() {
    const mappings = (await listCLOPLOMapping()).filter(
      (m) => ploById[m.plo_id]?.curriculum_id === selectedCurriculumId
    );
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

  const curriculumSelect = (
    <div className="form-field">
      <label htmlFor="clo-plo-curriculum-select">หลักสูตร</label>
      <select
        id="clo-plo-curriculum-select"
        value={selectedCurriculumId ?? ""}
        onChange={(e) => handleSelectCurriculum(e.target.value)}
      >
        <option value="" disabled>
          -- เลือกหลักสูตร --
        </option>
        {curricula.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.year})
          </option>
        ))}
      </select>
    </div>
  );

  if (!selectedCurriculumId) {
    return (
      <div className="crud-manager">
        <Link to="/admin" className="crud-back-link">
          <ArrowLeft size={14} strokeWidth={2} />
          กลับหน้าจัดการระบบ
        </Link>
        <div className="crud-header">
          <h2>เชื่อมโยง CLO กับ PLO</h2>
          <button disabled>+ เพิ่ม</button>
        </div>
        {curriculumSelect}
        <p>กรุณาเลือกหลักสูตรก่อน</p>
      </div>
    );
  }

  return (
    <>
      {curriculumSelect}
      <CrudManager
        key={selectedCurriculumId}
        title={pageTitle}
        columns={columns}
        api={{
          list: listCLOPLOMappingWithMismatch,
          create: createCLOPLOMapping,
          update: updateCLOPLOMapping,
          remove: deleteCLOPLOMapping,
        }}
        crossFieldCheck={CLO_PLO_CROSS_FIELD_CHECK}
      />
    </>
  );
}
