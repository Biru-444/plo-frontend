/**
 * ทำอะไร : Phase 3 ของฟีเจอร์ "นำเข้าข้อมูลวิชาจาก มคอ.3 ด้วย AI" (route /admin/course-import-mco3)
 *          — เลือกหลักสูตร + อัปโหลดไฟล์ .pdf/.docx -> เรียก Phase 1 (แกะข้อมูลด้วย Gemini) ->
 *          แสดงผลลัพธ์ทั้งหมดในฟอร์มที่แก้ไขได้ทุกฟิลด์ (วิชา, CLO ทีละแถว, ความสัมพันธ์กับ PLO) พร้อม
 *          ไฮไลต์ flag ที่เจอ -> กด "ยืนยันบันทึก" เรียก Phase 2 (บันทึกจริงเป็น Course+CLO+
 *          CLOPLOMapping)
 *
 * เชื่อมกับ : importCourseFromMco3/saveCourseFromMco3 ใน api/client.js — หลัง Phase 1 สำเร็จ
 *             ข้อมูลทั้งหมดย้ายเข้า local state ของหน้านี้ทั้งชุด (ไม่ใช่แค่แสดงผล response ตรงๆ)
 *             แอดมินแก้ไขตรงนี้ได้อิสระ กด "ยืนยันบันทึก" ถึงจะส่ง state ที่แก้แล้วไป Phase 2 - ไม่เรียก
 *             Phase 1 ซ้ำตอนกดยืนยัน (ต่างจาก AdminRosterImport.jsx ที่ dry-run/commit เรียก endpoint
 *             เดียวกันซ้ำด้วยไฟล์เดิม เพราะไฟล์ roster deterministic แต่ผลลัพธ์ AI ต้องให้คนแก้ก่อนเสมอ)
 *
 * ถ้าแก้ : แต่ละแถว CLO เก็บ ploCodes (Set ของรหัส PLO ที่ผูกไว้) เป็น field บนตัว row เอง คีย์ด้วย
 *          rowId ที่คงที่ตลอด ไม่ใช่ code - แก้รหัส CLO ของแถวนั้นจึงไม่ทำให้ mapping ที่เลือกไว้หลุด
 *          ลบแถว CLO ก็ลบ mapping ของแถวนั้นไปด้วยในตัว (เป็น field เดียวกัน ไม่ต้อง cascade แยก) —
 *          flags[]/instructor_name/semester_display ที่ Phase 1 ส่งมา **ห้ามส่งต่อไป Phase 2 เด็ดขาด**
 *          (ไม่มีคอลัมน์ปลายทางให้เก็บ ดู CourseImportSaveRequest ฝั่ง backend) — payload ที่ส่งไป
 *          Phase 2 ต้อง trim/derive จาก state ที่นี่เท่านั้น
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Sparkles, Upload } from "lucide-react";
import SearchableSelect from "../../components/SearchableSelect.jsx";
import { importCourseFromMco3, listCurricula, listPLO, saveCourseFromMco3 } from "../../api/client.js";

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

      const rows = (result.clos || []).map((clo) => ({
        rowId: cloRowIdRef.current++,
        code: clo.code || "",
        description: clo.description || "",
        domain: clo.domain || "",
        ploCodes: new Set(
          (result.clo_plo_mapping || [])
            .filter((m) => m.clo_code === clo.code)
            .map((m) => m.plo_code)
        ),
      }));
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

  function toggleCloPlo(rowId, ploCode) {
    setCloRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        const next = new Set(r.ploCodes);
        if (next.has(ploCode)) next.delete(ploCode);
        else next.add(ploCode);
        return { ...r, ploCodes: next };
      })
    );
  }

  function addCloRow() {
    setCloRows((prev) => [
      ...prev,
      { rowId: cloRowIdRef.current++, code: "", description: "", domain: "", ploCodes: new Set() },
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

    const payload = {
      curriculum_id: Number(curriculumId),
      course_code: courseCode.trim(),
      name_th: nameTh.trim(),
      name_en: nameEn.trim() || null,
      credit: parsedCredit,
      category: category.trim() || null,
      clos: cloRows.map((r) => ({
        code: r.code.trim(),
        description: r.description.trim(),
        domain: r.domain || null,
      })),
      clo_plo_mapping: cloRows.flatMap((r) =>
        Array.from(r.ploCodes).map((plo_code) => ({ clo_code: r.code.trim(), plo_code }))
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
            </div>
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
                          row.ploCodes.has(plo.code) ? "active" : ""
                        }`}
                        onClick={() => toggleCloPlo(row.rowId, plo.code)}
                      >
                        {plo.code}
                      </button>
                    ))}
                  </div>
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
            {saveResult.course.name_th} ({saveResult.clos.length} CLO) - เลือกไฟล์อื่นด้านบนเพื่อนำเข้าวิชาต่อไป
          </p>
        </div>
      )}
    </div>
  );
}
