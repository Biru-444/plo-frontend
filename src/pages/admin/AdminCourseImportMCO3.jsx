/**
 * ทำอะไร : Phase 3 ของฟีเจอร์ "นำเข้าข้อมูลวิชาจาก มคอ.3 ด้วย AI" (route /admin/course-import-mco3)
 *          — เลือกหลักสูตร + อัปโหลดไฟล์ .pdf/.docx -> เรียก Phase 1 (แกะข้อมูลด้วย Gemini) ->
 *          แสดงผลลัพธ์ทั้งหมดในฟอร์มที่แก้ไขได้ทุกฟิลด์ (วิชา, CLO ทีละแถว, ความสัมพันธ์กับ PLO, ชั้นปี/
 *          ภาคการศึกษา) พร้อมไฮไลต์ flag ที่เจอ -> กด "ยืนยันบันทึก" เรียก Phase 2 (บันทึกจริงเป็น
 *          Course+CLO+CLOPLOMapping+StudyPlan 1 แถว)
 *
 * เชื่อมกับ : importCourseFromMco3/saveCourseFromMco3 ใน api/client.js — หลัง Phase 1 สำเร็จ
 *             ข้อมูลทั้งหมดย้ายเข้า local state ของหน้านี้ทั้งชุด (ไม่ใช่แค่แสดงผล response ตรงๆ)
 *             แอดมินแก้ไขตรงนี้ได้อิสระ กด "ยืนยันบันทึก" ถึงจะส่ง state ที่แก้แล้วไป Phase 2 - ไม่เรียก
 *             Phase 1 ซ้ำตอนกดยืนยัน (ต่างจาก AdminRosterImport.jsx ที่ dry-run/commit เรียก endpoint
 *             เดียวกันซ้ำด้วยไฟล์เดิม เพราะไฟล์ roster deterministic แต่ผลลัพธ์ AI ต้องให้คนแก้ก่อนเสมอ)
 *
 * ถ้าแก้ : แต่ละแถว CLO เก็บ ploWeights ({ [plo_code]: weight_percent }) เป็น field บนตัว row เอง
 *          คีย์ด้วย rowId ที่คงที่ตลอด ไม่ใช่ code - แก้รหัส CLO ของแถวนั้นจึงไม่ทำให้ mapping ที่เลือก
 *          ไว้หลุด ลบแถว CLO ก็ลบ mapping ของแถวนั้นไปด้วยในตัว (เป็น field เดียวกัน ไม่ต้อง cascade
 *          แยก) — flags[]/instructor_name/semester_display (ข้อความดิบ) ที่ Phase 1 ส่งมา **ห้ามส่งต่อ
 *          ไป Phase 2 เด็ดขาด** (ไม่มีคอลัมน์ปลายทางให้เก็บ ดู CourseImportSaveRequest ฝั่ง backend) —
 *          payload ที่ส่งไป Phase 2 ต้อง trim/derive จาก state ที่นี่เท่านั้น
 *
 *          weight_percent (Workstream 3) : Phase 1/Gemini ไม่รู้จัก field นี้เลย (ดู
 *          MCO3CLOPLOMappingItem ฝั่ง backend - แยกจาก MCO3CLOPLOMappingSaveItem ที่ใช้ตอน Phase 2)
 *          toggleCloPlo เกลี่ยเท่ากันเองทุกครั้งที่ติ๊ก/ถอด PLO ของแถวนั้น (evenWeightPercent - สูตร
 *          เดียวกับ _rebalance_clo_weights_evenly ฝั่ง backend) updateCloPloWeight แก้เองด้วยมือได้ทีหลัง
 *          ทีละคู่ ไม่กระทบคู่อื่น - handleSave เช็คว่าทุกน้ำหนักต้อง > 0 และ <= 100 ก่อนส่ง Phase 2 เสมอ
 *
 *          ชั้นปี/ภาคการศึกษา (เพิ่ม 2026-09, เว้นว่างได้ 2026-09-23) : parseSemesterDisplay เดา
 *          year_level/semester จาก semester_display (ข้อความดิบ เช่น "1/2568 ชั้นปีที่ 1") ให้อัตโนมัติ
 *          แบบ best-effort ล้วนๆ (regex ไม่เรียก Gemini ซ้ำ) เติมลงช่องแก้ไขได้ทันทีหลัง Phase 1 เสร็จ -
 *          แอดมินแก้เองได้เสมอถ้าเดาผิด/เดาไม่ออก **ทั้งสองช่องเว้นว่างพร้อมกันได้** (วิชาเลือกหลายวิชา
 *          ไม่มีชั้นปีตายตัวในเอกสารจริง) แต่ต้องเป็นคู่เสมอ - กรอกแค่ช่องเดียวโดน formError กันไว้ก่อนส่ง
 *          (ตรงกับกฎ 422 ฝั่ง backend เป๊ะ) เก็บข้อความดิบ (semesterDisplayRaw) ไว้แสดงอ้างอิงข้างๆ ช่อง
 *          เท่านั้น ไม่ส่งไป Phase 2 (ดูย่อหน้าบน) ส่งแค่ yearLevel/semester (ตัวเลขสุดท้ายที่แอดมินยืนยัน
 *          แล้ว หรือ null คู่กันถ้าเว้นว่างไว้) ไป Phase 2 -> สร้าง study_plan 1 แถวคู่กับ course ถ้ามีค่า
 *          (cohort_year=NULL แผนมาตรฐาน) ไม่สร้างเลยถ้า null ทั้งคู่
 *
 *          การจับคู่รหัส PLO/CLO (แก้บั๊ก 2026-09-23) : รหัสที่ Gemini แกะได้ (เช่น "PLO4") อาจเขียนคนละ
 *          รูปแบบกับที่บันทึกไว้ใน DB จริง (เช่น "PLO 4" มีช่องว่าง จากที่ มคอ.2 import เคยบันทึกไว้ก่อน
 *          จะมี normalize) - handleExtract จับคู่ผ่าน normalizeCode() เสมอ (ดู
 *          plo-frontend/src/utils/codeNormalize.js - กฎเดียวกับ app/services/code_normalize.py ฝั่ง
 *          backend) รหัส PLO ที่จับคู่กับ PLO จริงในหลักสูตรไม่ได้ **ไม่ถูกเลือก/ทดแทนด้วย PLO อื่นเงียบๆ
 *          เด็ดขาด** - เก็บแยกไว้ใน row.unmatchedPloCodes แสดงเป็นชิปสีแดงเตือนแทน (ดู
 *          mco3-plo-chip-unmatched) ให้แอดมินไปแก้รหัส PLO ในหลักสูตร หรือผูกเองด้วยมือผ่านชิปปกติ
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Sparkles, Upload } from "lucide-react";
import SearchableSelect from "../../components/SearchableSelect.jsx";
import { importCourseFromMco3, listCurricula, listPLO, saveCourseFromMco3 } from "../../api/client.js";
import { normalizeCode } from "../../utils/codeNormalize.js";

const DOMAIN_OPTIONS = [
  { value: "", label: "ไม่ระบุ" },
  { value: "knowledge", label: "ความรู้" },
  { value: "skills", label: "ทักษะ" },
  { value: "ethics", label: "จริยธรรม" },
  { value: "character", label: "ลักษณะบุคคล" },
];

// ตัวเลือกหมวดหมู่วิชาตายตัว 2 แบบ + "อื่นๆ" - ต้องตรงกับ FIXED_CATEGORY_OPTIONS ใน
// CurriculumCourses.jsx เป๊ะ ไม่งั้นค่าที่บันทึกจากหน้านี้จะไม่ตรงกับที่หน้าจัดการวิชาปกติรู้จัก
const FIXED_CATEGORY_OPTIONS = ["วิชาแกน", "วิชาบังคับ"];
const OTHER_CATEGORY_VALUE = "__other__";

const SEVERE_FLAG_TYPES = new Set(["duplicate_course_code", "curriculum_mismatch"]);

// เกลี่ยน้ำหนักเท่ากันสำหรับ CLO 1 แถว ตอนติ๊ก/ถอด PLO (Workstream 3) - ปัดเหลือ 2 ตำแหน่งทศนิยม เหมือน
// _rebalance_clo_weights_evenly ฝั่ง backend (app/routes/clo_plo_mapping.py) ทุกประการ เพื่อให้พฤติกรรม
// ตรงกัน ไม่ว่าจะผูกผ่านหน้านี้หรือหน้า AdminCLOPLOMapping.jsx
function evenWeightPercent(count) {
  return Math.round((100 / count) * 100) / 100;
}

// เดา year_level/semester จากข้อความดิบ semester_display ของ Phase 1 แบบ best-effort (regex ล้วนๆ ไม่
// เรียก Gemini ซ้ำ) - แค่ prefill ให้ช่องแก้ไข แอดมินแก้เองได้เสมอถ้าเดาผิด/เดาไม่ออก (คืน null = เดาไม่ออก
// ปล่อยให้ช่องว่างบังคับแอดมินกรอกเอง ดีกว่าเดามั่วแล้วดูน่าเชื่อถือเกินจริง)
//
// เทอม : ลองรูปแบบ "N/พ.ศ." ก่อน (เช่น "1/2568" - รูปแบบที่พบบ่อยสุดตามตัวอย่างใน system instruction ของ
// Gemini) แล้วค่อย "ภาคเรียนที่/ภาคการศึกษาที่/ภาคที่/เทอม N" แล้วค่อยคำเต็มไม่มีเลข (ภาคต้น/ภาคปลาย/
// ภาคฤดูร้อน) - ชั้นปี : "ชั้นปี(ที่) N" หรือ "ปี(ที่) N" (ไม่ชนกับ "ปีการศึกษา" เพราะไม่มีเลขตามหลังคำนั้น
// ทันทีในรูปแบบเอกสารจริง - ทดสอบแล้วด้วย test เฉพาะ)
export function parseSemesterDisplay(text) {
  if (!text) return { yearLevel: null, semester: null };

  let semester = null;
  let m = text.match(/(\d)\s*\/\s*25\d{2}/);
  if (m) semester = Number(m[1]);
  if (semester === null) {
    m = text.match(/(?:ภาคเรียนที่|ภาคการศึกษาที่|ภาคที่|เทอม)\s*(\d)/);
    if (m) semester = Number(m[1]);
  }
  if (semester === null) {
    if (/ภาคต้น/.test(text)) semester = 1;
    else if (/ภาคปลาย/.test(text)) semester = 2;
    else if (/ภาคฤดูร้อน/.test(text)) semester = 3;
  }

  let yearLevel = null;
  m = text.match(/(?:ชั้นปี|ปี)\s*(?:ที่)?\s*(\d)/);
  if (m) yearLevel = Number(m[1]);

  return {
    semester: semester !== null && semester >= 1 && semester <= 3 ? semester : null,
    yearLevel: yearLevel !== null && yearLevel >= 1 && yearLevel <= 4 ? yearLevel : null,
  };
}

const FLAG_TYPE_LABEL = {
  category_mismatch: "หมวดหมู่วิชาไม่ตรง",
  checkbox_ambiguous: "ตาราง PLO-CLO อ่านไม่ออก",
  duplicate_course_code: "รหัสวิชาขัดแย้งกันเอง",
  curriculum_mismatch: "เอกสารอาจเป็นของหลักสูตรอื่น",
  title_content_mismatch: "หัวเรื่องไม่ตรงกับเนื้อหา",
  plo_mapping_not_filled: "ตาราง PLO-CLO ยังไม่ได้กรอก",
  domain_category_mismatch: "โดเมน CLO ไม่ตรงกับหมวดหมู่ PLO",
  other: "ข้อสังเกตอื่น",
};

// ช่อง "หมวดหมู่วิชา" - เหมือน CourseCategoryField (CurriculumCourses.jsx) / PLOCategoryField
// (AdminPLO.jsx) ทุกประการ ตั้งใจก๊อปแยกไฟล์ตามธรรมเนียมเดิมของโปรเจกต์นี้ (ทั้งสองหน้านั้นก็ไม่ได้แชร์
// component เดียวกัน) ไม่ทำ shared component ใหม่ข้ามหน้าตอนนี้
function CourseCategoryPicker({ value, onChange }) {
  const [isOther, setIsOther] = useState(
    () => value !== "" && !FIXED_CATEGORY_OPTIONS.includes(value)
  );

  function handleSelect(selected) {
    if (selected === OTHER_CATEGORY_VALUE) {
      setIsOther(true);
      onChange("");
    } else {
      setIsOther(false);
      onChange(selected);
    }
  }

  const current = isOther ? OTHER_CATEGORY_VALUE : value;

  return (
    <>
      <div className="plo-filter-pills">
        {FIXED_CATEGORY_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`plo-filter-pill ${current === opt ? "active" : ""}`}
            onClick={() => handleSelect(opt)}
          >
            {opt}
          </button>
        ))}
        <button
          type="button"
          className={`plo-filter-pill ${current === OTHER_CATEGORY_VALUE ? "active" : ""}`}
          onClick={() => handleSelect(OTHER_CATEGORY_VALUE)}
        >
          อื่นๆ
        </button>
      </div>
      {isOther && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="พิมพ์หมวดหมู่เอง"
        />
      )}
    </>
  );
}

// รายการ flag ที่ Gemini ส่งกลับมา - duplicate_course_code/curriculum_mismatch เด่นกว่า (แดง) เพราะ
// เป็นปัญหาที่กระทบความถูกต้องของข้อมูลโดยตรง ส่วนที่เหลือเป็นข้อสังเกตประกอบ (ส้ม) ไม่บล็อกการบันทึก
function FlagList({ flags }) {
  if (!flags || flags.length === 0) return null;
  return (
    <div className="mco3-flag-list">
      {flags.map((f, i) => {
        const severe = SEVERE_FLAG_TYPES.has(f.type);
        return (
          <div key={i} className={`mco3-flag ${severe ? "mco3-flag-severe" : "mco3-flag-normal"}`}>
            <AlertTriangle size={16} strokeWidth={2} />
            <div>
              <span className="mco3-flag-type">{FLAG_TYPE_LABEL[f.type] || f.type}</span>
              {f.message}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminCourseImportMCO3() {
  const [curricula, setCurricula] = useState([]);
  const [curriculumId, setCurriculumId] = useState("");
  const [plos, setPlos] = useState([]);

  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [extracted, setExtracted] = useState(false);
  const [flags, setFlags] = useState([]);

  const [courseCode, setCourseCode] = useState("");
  const [nameTh, setNameTh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [credit, setCredit] = useState("");
  const [category, setCategory] = useState("");

  // ชั้นปี/ภาคการศึกษา (สำหรับ study_plan) - yearLevel/semester เริ่มจากค่าที่ parseSemesterDisplay
  // เดาได้ (ดู handleExtract) แอดมินแก้เองได้เสมอ semesterDisplayRaw เก็บไว้แสดงอ้างอิงข้างๆ ช่องเท่านั้น
  // ไม่ส่งไป Phase 2 เลย (ดู module docstring)
  const [semesterDisplayRaw, setSemesterDisplayRaw] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [semester, setSemester] = useState("");

  // rowId เป็น key ที่คงที่ตลอดของแต่ละแถว CLO (คนละตัวกับ code ที่แก้ไขได้) - ดู module docstring
  const cloRowIdRef = useRef(0);
  const [cloRows, setCloRows] = useState([]);

  const [ackCurriculumMismatch, setAckCurriculumMismatch] = useState(false);
  const [formError, setFormError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveResult, setSaveResult] = useState(null);

  useEffect(() => {
    listCurricula()
      .then(setCurricula)
      .catch(() => {});
    listPLO()
      .then(setPlos)
      .catch(() => {});
  }, []);

  const curriculumOptions = useMemo(
    () => curricula.map((c) => ({ value: c.id, label: `${c.name} (${c.year})` })),
    [curricula]
  );

  // PLO เฉพาะของหลักสูตรที่เลือกอยู่ (listPLO() คืนทุกหลักสูตรรวมกัน กรองฝั่ง frontend เอง - เหมือน
  // pattern courseCLOs ใน CourseOfferingWorkspace.jsx)
  const curriculumPlos = useMemo(
    () => plos.filter((p) => String(p.curriculum_id) === String(curriculumId)),
    [plos, curriculumId]
  );

  const hasCurriculumMismatchFlag = flags.some((f) => f.type === "curriculum_mismatch");

  function resetReviewState() {
    setExtracted(false);
    setFlags([]);
    setCourseCode("");
    setNameTh("");
    setNameEn("");
    setCredit("");
    setCategory("");
    setCloRows([]);
    setSemesterDisplayRaw("");
    setYearLevel("");
    setSemester("");
    setAckCurriculumMismatch(false);
    setFormError("");
    setSaveError("");
    setSaveResult(null);
  }

  function handleSelectCurriculum(value) {
    setCurriculumId(value);
    // เปลี่ยนหลักสูตร = ผลตรวจ/flag เดิมทั้งหมด (โดยเฉพาะ curriculum_mismatch) อ้างอิงหลักสูตรเก่าไปแล้ว
    // ต้องเริ่มวิเคราะห์ใหม่เสมอ ไม่ปล่อยให้ฟอร์มเก่าค้างอยู่กับหลักสูตรใหม่
    setFile(null);
    setFileInputKey((k) => k + 1);
    resetReviewState();
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setExtractError("");
    resetReviewState();
  }

  function handleReset() {
    setFile(null);
    setFileInputKey((k) => k + 1);
    setExtractError("");
    resetReviewState();
  }

  async function handleExtract() {
    if (!file || !curriculumId) return;
    setExtracting(true);
    setExtractError("");
    try {
      const result = await importCourseFromMco3(file, curriculumId);
      setCourseCode(result.course_code || "");
      setNameTh(result.name_th || "");
      setNameEn(result.name_en || "");
      setCredit(result.credit != null ? String(result.credit) : "");
      setCategory(result.category_mapped || result.category_raw || "");
      setFlags(result.flags || []);

      setSemesterDisplayRaw(result.semester_display || "");
      const guessed = parseSemesterDisplay(result.semester_display);
      setYearLevel(guessed.yearLevel != null ? String(guessed.yearLevel) : "");
      setSemester(guessed.semester != null ? String(guessed.semester) : "");

      const rows = (result.clos || []).map((clo) => {
        const cloCodeNormalized = normalizeCode(clo.code);
        // จับคู่ plo_code ที่ Gemini แกะได้กับ PLO จริงในหลักสูตรผ่าน normalizeCode() เสมอ (ไม่ใช่ ===
        // ตรงๆ) - รหัสที่จับคู่ไม่ได้ **ไม่เลือก/ทดแทนด้วย PLO อื่นเงียบๆ เด็ดขาด** เก็บแยกไว้ใน
        // unmatchedPloCodes แสดงเป็นชิปเตือนแทน (ดู module docstring ด้านบน)
        const matchedPloCodes = [];
        const unmatchedPloCodes = [];
        (result.clo_plo_mapping || [])
          .filter((m) => normalizeCode(m.clo_code) === cloCodeNormalized)
          .forEach((m) => {
            const matched = curriculumPlos.find((p) => normalizeCode(p.code) === normalizeCode(m.plo_code));
            if (matched) {
              // ใช้ code จริงจาก DB เป็น key ของ ploWeights เสมอ (canonical อยู่แล้ว) ไม่ใช่ข้อความดิบที่
              // Gemini แกะมา แม้จะจับคู่กันได้แล้วก็ตาม (กันกรณี normalize แล้วเท่ากันแต่สะกดคนละแบบ
              // เช่น "plo4" vs "PLO4" ทำให้ ploWeights มีคีย์ซ้ำความหมายแต่คนละ string)
              if (!matchedPloCodes.includes(matched.code)) matchedPloCodes.push(matched.code);
            } else {
              unmatchedPloCodes.push(m.plo_code);
            }
          });
        // เกลี่ยเท่ากันตั้งแต่แรกที่แกะมาจาก Gemini (Phase 1 ไม่รู้จัก weight เลย - ดู
        // MCO3CLOPLOMappingItem) เหมือนกับว่าแอดมินเพิ่งผูกคู่เหล่านี้เองทีละคู่ (นับเฉพาะคู่ที่จับคู่ได้
        // จริง - unmatched ไม่มี weight เพราะไม่ได้ถูกผูกเลย)
        const weight = matchedPloCodes.length > 0 ? evenWeightPercent(matchedPloCodes.length) : null;
        return {
          rowId: cloRowIdRef.current++,
          code: clo.code || "",
          description: clo.description || "",
          domain: clo.domain || "",
          ploWeights: Object.fromEntries(matchedPloCodes.map((code) => [code, weight])),
          unmatchedPloCodes,
        };
      });
      setCloRows(rows);
      setExtracted(true);
    } catch (err) {
      setExtractError(
        err?.response?.data?.detail || "วิเคราะห์เอกสารไม่สำเร็จ ลองใหม่อีกครั้ง หรือตรวจสอบว่าเป็นไฟล์ มคอ.3 จริง"
      );
    } finally {
      setExtracting(false);
    }
  }

  function updateCloRow(rowId, field, value) {
    setCloRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r)));
  }

  // ติ๊ก/ถอด PLO ให้ CLO แถวนี้ - หลังเปลี่ยนชุด PLO แล้ว เกลี่ยน้ำหนักของทุกคู่ที่เหลือ (รวมคู่ใหม่ที่
  // เพิ่งติ๊กด้วย) ให้เท่ากันเสมอ ทับค่าที่เคยแก้มือไว้ (auto-fill เกลี่ยเท่ากันเสมอตอนโครงสร้างเปลี่ยน -
  // เหมือน _rebalance_clo_weights_evenly ฝั่ง backend)
  function toggleCloPlo(rowId, ploCode) {
    setCloRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        const nextCodes = r.ploWeights[ploCode] !== undefined
          ? Object.keys(r.ploWeights).filter((c) => c !== ploCode)
          : [...Object.keys(r.ploWeights), ploCode];
        if (nextCodes.length === 0) return { ...r, ploWeights: {} };
        const weight = evenWeightPercent(nextCodes.length);
        return { ...r, ploWeights: Object.fromEntries(nextCodes.map((c) => [c, weight])) };
      })
    );
  }

  // แก้น้ำหนักของคู่เดียวด้วยมือ - ไม่ rebalance คู่อื่นของแถวเดียวกันตาม (เหมือน PUT
  // /clo-plo-mapping/{id} ฝั่ง backend ที่ไม่ trigger การเกลี่ยคู่พี่น้อง)
  function updateCloPloWeight(rowId, ploCode, value) {
    setCloRows((prev) =>
      prev.map((r) =>
        r.rowId === rowId ? { ...r, ploWeights: { ...r.ploWeights, [ploCode]: value } } : r
      )
    );
  }

  function addCloRow() {
    setCloRows((prev) => [
      ...prev,
      { rowId: cloRowIdRef.current++, code: "", description: "", domain: "", ploWeights: {} },
    ]);
  }

  function removeCloRow(rowId) {
    setCloRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  // ตรวจทุกแถว/ทุกเงื่อนไขก่อนยิง request เดียวไป Phase 2 (ซึ่งเป็น atomic transaction อยู่แล้วฝั่ง
  // backend) - เช็คฝั่ง frontend ก่อนแค่เพื่อ feedback เร็วกว่ารอ 400/409 กลับมา ไม่ใช่แหล่งความจริง
  async function handleSave() {
    setFormError("");
    setSaveError("");

    if (!courseCode.trim() || !nameTh.trim()) {
      setFormError("กรุณากรอกรหัสวิชาและชื่อวิชา (ภาษาไทย)");
      return;
    }
    const parsedCredit = Number(credit);
    if (!Number.isInteger(parsedCredit) || parsedCredit <= 0) {
      setFormError('"หน่วยกิต" ต้องเป็นจำนวนเต็มมากกว่า 0');
      return;
    }
    // ชั้นปี/ภาคการศึกษา เว้นว่างได้ทั้งคู่ (วิชาเลือกที่ไม่มีชั้นปีตายตัว) แต่ต้องเป็นคู่เสมอ - มีค่าแค่
    // ช่องเดียวคือข้อมูลไม่ครบ (ตรงกับกฎฝั่ง backend เป๊ะ - ดู CourseImportSaveRequest)
    const yearLevelTrimmed = yearLevel.trim();
    const semesterTrimmed = semester.trim();
    let parsedYearLevel = null;
    let parsedSemester = null;
    if (yearLevelTrimmed || semesterTrimmed) {
      if (!yearLevelTrimmed || !semesterTrimmed) {
        setFormError('ต้องกรอกทั้ง "ชั้นปี" และ "ภาคการศึกษา" คู่กัน หรือเว้นว่างทั้งคู่ (ถ้าวิชานี้ไม่มีชั้นปีตายตัว)');
        return;
      }
      parsedYearLevel = Number(yearLevelTrimmed);
      if (!Number.isInteger(parsedYearLevel) || parsedYearLevel < 1 || parsedYearLevel > 4) {
        setFormError('"ชั้นปี" ต้องเป็นจำนวนเต็ม 1-4 (ระบบเดาให้อัตโนมัติจากเอกสาร - ถ้าเดาผิดให้แก้เอง หรือเว้นว่างทั้งคู่)');
        return;
      }
      parsedSemester = Number(semesterTrimmed);
      if (!Number.isInteger(parsedSemester) || parsedSemester < 1 || parsedSemester > 3) {
        setFormError('"ภาคการศึกษา" ต้องเป็นจำนวนเต็ม 1-3 (ระบบเดาให้อัตโนมัติจากเอกสาร - ถ้าเดาผิดให้แก้เอง หรือเว้นว่างทั้งคู่)');
        return;
      }
    }
    const trimmedCodes = cloRows.map((r) => r.code.trim());
    if (trimmedCodes.some((c) => !c)) {
      setFormError("ทุกแถว CLO ต้องมีรหัส (เช่น CLO1)");
      return;
    }
    if (new Set(trimmedCodes).size !== trimmedCodes.length) {
      setFormError("รหัส CLO ซ้ำกันภายในวิชานี้ - แก้ให้รหัสไม่ซ้ำก่อนบันทึก");
      return;
    }
    if (hasCurriculumMismatchFlag && !ackCurriculumMismatch) {
      setFormError('มี flag "เอกสารอาจเป็นของหลักสูตรอื่น" - กรุณาติ๊กยืนยันด้านล่างก่อนบันทึก');
      return;
    }
    const hasInvalidWeight = cloRows.some((r) =>
      Object.values(r.ploWeights).some((w) => !(Number(w) > 0) || Number(w) > 100)
    );
    if (hasInvalidWeight) {
      setFormError("น้ำหนักของทุกคู่ CLO-PLO ต้องเป็นตัวเลขมากกว่า 0 และไม่เกิน 100");
      return;
    }

    const payload = {
      curriculum_id: Number(curriculumId),
      course_code: courseCode.trim(),
      name_th: nameTh.trim(),
      name_en: nameEn.trim() || null,
      credit: parsedCredit,
      category: category.trim() || null,
      year_level: parsedYearLevel,
      semester: parsedSemester,
      clos: cloRows.map((r) => ({
        code: r.code.trim(),
        description: r.description.trim(),
        domain: r.domain || null,
      })),
      clo_plo_mapping: cloRows.flatMap((r) =>
        Object.entries(r.ploWeights).map(([plo_code, weight_percent]) => ({
          clo_code: r.code.trim(),
          plo_code,
          weight_percent: Number(weight_percent),
        }))
      ),
    };

    setSaving(true);
    try {
      const result = await saveCourseFromMco3(payload);
      setSaveResult(result);
    } catch (err) {
      // ไม่ล้างฟอร์มทิ้งตอน error (ต่างจาก roster import ที่ re-run ใหม่ถูก) - แก้ไขที่นี่มีต้นทุนสูง
      // กว่ามาก แอดมินควรแก้แล้วกดบันทึกซ้ำได้เลย ไม่ต้องพิมพ์/เลือก mapping ใหม่ทั้งหมด
      setSaveError(err?.response?.data?.detail || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  const canExtract = file && curriculumId && !extracting;
  const showReviewForm = extracted && !saveResult;

  return (
    <div className="page">
      <h1>นำเข้าข้อมูลวิชาจาก มคอ.3 ด้วย AI</h1>
      <p className="admin-home-intro">
        อัปโหลดไฟล์ มคอ.3 (.pdf หรือ .docx) ระบบจะใช้ AI แกะข้อมูลวิชา/CLO/ความสัมพันธ์กับ PLO
        ออกมาให้ตรวจสอบและแก้ไขได้ทุกฟิลด์ก่อนเสมอ - จะไม่มีอะไรถูกบันทึกลงระบบจนกว่าจะกด
        "ยืนยันบันทึก" ด้านล่าง
      </p>

      <div className="workspace-section">
        <h2>
          <Upload size={18} strokeWidth={2} /> เลือกหลักสูตรและไฟล์
        </h2>
        <div className="workspace-inline-form">
          <div className="form-field">
            <label htmlFor="mco3-curriculum">หลักสูตรเป้าหมาย</label>
            <SearchableSelect
              id="mco3-curriculum"
              value={curriculumId}
              onChange={handleSelectCurriculum}
              options={curriculumOptions}
              placeholder="เลือกหลักสูตร..."
            />
          </div>
          <input
            key={fileInputKey}
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            disabled={!curriculumId}
          />
          <button type="button" onClick={handleExtract} disabled={!canExtract}>
            <Sparkles size={16} strokeWidth={2} />
            {extracting ? "กำลังวิเคราะห์..." : "วิเคราะห์เอกสารด้วย AI"}
          </button>
          {(extracted || saveResult) && (
            <button type="button" onClick={handleReset}>
              เลือกไฟล์อื่น
            </button>
          )}
        </div>
        {!curriculumId && <p className="workspace-hint-inline">เลือกหลักสูตรก่อนจึงจะเลือกไฟล์ได้</p>}
        {extracting && (
          <p className="workspace-hint-inline">กำลังวิเคราะห์เอกสารด้วย AI... อาจใช้เวลาถึง 1 นาที</p>
        )}
        {extractError && <p className="error-message">{extractError}</p>}
      </div>

      {showReviewForm && (
        <>
          <FlagList flags={flags} />

          <div className="workspace-section">
            <h2>ข้อมูลวิชา</h2>
            <div className="workspace-inline-form">
              <div className="form-field">
                <label htmlFor="mco3-course-code">รหัสวิชา</label>
                <input
                  id="mco3-course-code"
                  type="text"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="mco3-name-th">ชื่อวิชา (ไทย)</label>
                <input
                  id="mco3-name-th"
                  type="text"
                  value={nameTh}
                  onChange={(e) => setNameTh(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="mco3-name-en">ชื่อวิชา (อังกฤษ)</label>
                <input
                  id="mco3-name-en"
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="mco3-credit">หน่วยกิต</label>
                <input
                  id="mco3-credit"
                  type="number"
                  step="1"
                  min="1"
                  value={credit}
                  onChange={(e) => setCredit(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="mco3-year-level">ชั้นปี</label>
                <input
                  id="mco3-year-level"
                  type="number"
                  step="1"
                  min="1"
                  max="4"
                  value={yearLevel}
                  onChange={(e) => setYearLevel(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="mco3-semester">ภาคการศึกษา</label>
                <input
                  id="mco3-semester"
                  type="number"
                  step="1"
                  min="1"
                  max="3"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                />
              </div>
            </div>
            <p className="workspace-hint-inline">เว้นว่างได้ สำหรับวิชาเลือกที่ไม่กำหนดชั้นปี</p>
            {semesterDisplayRaw && (
              <p className="workspace-hint-inline">
                ข้อความจากเอกสารต้นฉบับ (อ้างอิงเท่านั้น ไม่ได้บันทึก): "{semesterDisplayRaw}"
              </p>
            )}
            <div className="form-field mco3-course-category-field">
              <label>หมวดหมู่วิชา</label>
              <CourseCategoryPicker value={category} onChange={setCategory} />
            </div>
          </div>

          <div className="workspace-section">
            <h2>CLO และความสัมพันธ์กับ PLO ({cloRows.length} ข้อ)</h2>
            {cloRows.map((row) => (
              <div key={row.rowId} className="mco3-clo-row">
                <div className="mco3-clo-row-fields">
                  <div className="form-field">
                    <label htmlFor={`mco3-clo-code-${row.rowId}`}>รหัส CLO</label>
                    <input
                      id={`mco3-clo-code-${row.rowId}`}
                      type="text"
                      value={row.code}
                      onChange={(e) => updateCloRow(row.rowId, "code", e.target.value)}
                    />
                  </div>
                  <div className="form-field form-field-grow">
                    <label htmlFor={`mco3-clo-desc-${row.rowId}`}>คำอธิบาย</label>
                    <input
                      id={`mco3-clo-desc-${row.rowId}`}
                      type="text"
                      value={row.description}
                      onChange={(e) => updateCloRow(row.rowId, "description", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={`mco3-clo-domain-${row.rowId}`}>โดเมน</label>
                    <select
                      id={`mco3-clo-domain-${row.rowId}`}
                      value={row.domain}
                      onChange={(e) => updateCloRow(row.rowId, "domain", e.target.value)}
                    >
                      {DOMAIN_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="icon-btn-delete"
                    title="ลบแถวนี้"
                    onClick={() => removeCloRow(row.rowId)}
                  >
                    ×
                  </button>
                </div>
                <div className="mco3-clo-row-plos">
                  <span className="mco3-clo-row-plos-label">ผูกกับ PLO:</span>
                  <div className="plo-filter-pills">
                    {curriculumPlos.length === 0 && (
                      <span className="workspace-hint-inline">หลักสูตรนี้ยังไม่มี PLO</span>
                    )}
                    {curriculumPlos.map((plo) => (
                      <button
                        key={plo.id}
                        type="button"
                        title={plo.description_th}
                        className={`plo-filter-pill mco3-plo-chip ${
                          row.ploWeights[plo.code] !== undefined ? "active" : ""
                        }`}
                        onClick={() => toggleCloPlo(row.rowId, plo.code)}
                      >
                        {plo.code}
                      </button>
                    ))}
                  </div>
                  {/* รหัส PLO ที่ Gemini แกะได้แต่จับคู่กับ PLO จริงในหลักสูตรไม่ได้ (แม้ normalize แล้ว
                      ก็ตาม) - แสดงเตือนตรงๆ ไม่เลือก/ทดแทนด้วย PLO อื่นเงียบๆ เด็ดขาด (ดู module
                      docstring หัวไฟล์) แอดมินต้องไปแก้รหัส PLO ในหลักสูตร หรือผูกเองด้วยมือผ่านชิปปกติ
                      ด้านบนแทน */}
                  {row.unmatchedPloCodes && row.unmatchedPloCodes.length > 0 && (
                    <div className="mco3-clo-row-unmatched-plos">
                      {row.unmatchedPloCodes.map((code) => (
                        <span
                          key={code}
                          className="plo-filter-pill mco3-plo-chip-unmatched"
                          title={`เอกสารระบุ PLO "${code}" แต่ไม่พบ PLO นี้ในหลักสูตร (เทียบแบบไม่สนตัวพิมพ์เล็ก-ใหญ่/ช่องว่างแล้ว) - ไม่ได้ผูกให้อัตโนมัติ ตรวจสอบรหัส PLO ในหลักสูตรหรือในเอกสารต้นฉบับ แล้วผูกเองด้วยมือถ้าถูกต้อง`}
                        >
                          <AlertTriangle size={12} strokeWidth={2} /> {code} (ไม่พบในหลักสูตร)
                        </span>
                      ))}
                    </div>
                  )}
                  {/* น้ำหนักของแต่ละคู่ที่ติ๊กไว้ - auto-fill เกลี่ยเท่ากันเองทุกครั้งที่ติ๊ก/ถอด (ดู
                      toggleCloPlo) แก้เองด้วยมือได้ต่อคู่ ไม่กระทบคู่อื่นของแถวเดียวกัน (ดู
                      updateCloPloWeight) */}
                  {Object.keys(row.ploWeights).length > 0 && (
                    <div className="mco3-clo-row-weights">
                      {Object.entries(row.ploWeights).map(([ploCode, weight]) => (
                        <label key={ploCode} className="mco3-clo-row-weight-field">
                          {ploCode}
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max="100"
                            value={weight}
                            onChange={(e) =>
                              updateCloPloWeight(row.rowId, ploCode, e.target.value)
                            }
                          />
                          %
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={addCloRow}>
              + เพิ่ม CLO
            </button>
          </div>

          {hasCurriculumMismatchFlag && (
            <label className="mco3-ack-box">
              <input
                type="checkbox"
                checked={ackCurriculumMismatch}
                onChange={(e) => setAckCurriculumMismatch(e.target.checked)}
              />
              <span>
                ฉันตรวจสอบแล้วว่าเลือกหลักสูตรถูกต้อง แม้ระบบจะพบว่าชื่อหลักสูตรในเอกสารไม่ตรงกับที่เลือกไว้
              </span>
            </label>
          )}

          {formError && <p className="error-message">{formError}</p>}
          {saveError && <p className="error-message">{saveError}</p>}

          <div className="workspace-section">
            <button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "กำลังบันทึก..." : "ยืนยันบันทึก"}
            </button>
          </div>
        </>
      )}

      {saveResult && (
        <div className="workspace-section">
          <p className="success-message">
            <CheckCircle2 size={16} strokeWidth={2} /> บันทึกสำเร็จ: {saveResult.course.course_code}{" "}
            {saveResult.course.name_th} ({saveResult.clos.length} CLO) -{" "}
            {saveResult.study_plan
              ? `แผนการศึกษา: ชั้นปีที่ ${saveResult.study_plan.year_level} ภาคการศึกษาที่ ${saveResult.study_plan.semester} (แผนมาตรฐาน)`
              : "ไม่ได้สร้างแผนการศึกษา (ไม่ได้ระบุชั้นปี/ภาคการศึกษา)"}{" "}
            - เลือกไฟล์อื่นด้านบนเพื่อนำเข้าวิชาต่อไป
          </p>
        </div>
      )}
    </div>
  );
}
