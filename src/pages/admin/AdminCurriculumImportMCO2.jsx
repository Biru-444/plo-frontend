/**
 * ทำอะไร : Phase 3 ของฟีเจอร์ "นำเข้าหลักสูตร/PLO จาก มคอ.2 ด้วย AI" (route
 *          /admin/curriculum-import-mco2, Workstream 2) — อัปโหลดไฟล์ .pdf/.docx -> เรียก Phase 1
 *          (แกะข้อมูลด้วย Gemini) -> แสดงผลลัพธ์ (ชื่อ/ปีหลักสูตร, รายการ PLO) ในฟอร์มที่แก้ไขได้ทุก
 *          ฟิลด์ พร้อมไฮไลต์ flag ที่เจอ -> กด "ยืนยันบันทึก" เรียก Phase 2 (บันทึกจริง)
 *          เลียนแบบแพทเทิร์นเดียวกับ AdminCourseImportMCO3.jsx (มคอ.3) ทุกประการ แต่ขอบเขตแคบกว่ามาก
 *          (เฉพาะ Curriculum + PLO ไม่มี Course/CLO)
 *
 * เชื่อมกับ : importCurriculumFromMco2/saveCurriculumFromMco2 ใน api/client.js — ต่างจาก มคอ.3 ตรงที่
 *             **ไม่ต้องเลือกหลักสูตรเป้าหมายล่วงหน้า** ก่อนอัปโหลด (เอกสาร มคอ.2 คือเอกสารนิยาม
 *             หลักสูตรเอง) - หลัง Phase 1 สำเร็จ ถ้า response.existing_curriculum_id ไม่ null แสดงว่ามี
 *             หลักสูตรชื่อ+ปีตรงกันอยู่แล้วในระบบ (เช็คจาก backend ตรงๆ) หน้านี้จะ default ไปโหมด
 *             "เพิ่ม/อัปเดต PLO เข้าหลักสูตรเดิม" ให้อัตโนมัติ (ไม่ใช่สร้างใหม่ซ้ำ) แอดมินสลับกลับเป็น
 *             "สร้างหลักสูตรใหม่แทน" ได้เองถ้าเห็นว่าระบบตรวจผิด (เช่นชื่อพ้องกันโดยบังเอิญ)
 *
 * ถ้าแก้ : plo.category เป็นคอลัมน์ NOT NULL ฝั่ง backend (ดู app/models/plo.py) - ปุ่ม "ยืนยันบันทึก"
 *          เช็คว่าทุกแถว PLO มี category ก่อนส่งเสมอ (เหมือน backend เช็คซ้ำอีกชั้น เป็น 400 ที่ชัดเจน)
 *          flags[] ที่ Phase 1 ส่งมาไม่ถูกส่งต่อไป Phase 2 เลย (ไม่มีที่เก็บถาวร เหมือน มคอ.3)
 */
import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Sparkles, Upload } from "lucide-react";
import { importCurriculumFromMco2, saveCurriculumFromMco2 } from "../../api/client.js";

const PLO_CATEGORY_OPTIONS = [
  { value: "", label: "-- ยังไม่ระบุ --" },
  { value: "ความรู้", label: "ความรู้ (Knowledge)" },
  { value: "ทักษะ", label: "ทักษะ (Skills)" },
  { value: "จริยธรรม", label: "จริยธรรม (Ethics)" },
  { value: "ลักษณะบุคคล", label: "ลักษณะบุคคล (Character)" },
];

const FLAG_TYPE_LABEL = {
  duplicate_plo_code: "รหัส PLO ขัดแย้งกันเองในเอกสาร",
  category_unclear: "หมวดหมู่ PLO ไม่ชัดเจน",
  other: "ข้อสังเกตอื่น",
};

function FlagList({ flags }) {
  if (!flags || flags.length === 0) return null;
  return (
    <div className="mco3-flag-list">
      {flags.map((f, i) => (
        <div key={i} className="mco3-flag mco3-flag-normal">
          <AlertTriangle size={16} strokeWidth={2} />
          <div>
            <span className="mco3-flag-type">{FLAG_TYPE_LABEL[f.type] || f.type}</span>
            {f.message}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminCurriculumImportMCO2() {
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [extracted, setExtracted] = useState(false);
  const [flags, setFlags] = useState([]);

  const [curriculumName, setCurriculumName] = useState("");
  const [curriculumYear, setCurriculumYear] = useState("");
  const [existingCurriculumId, setExistingCurriculumId] = useState(null);
  const [existingPloCodes, setExistingPloCodes] = useState([]);
  const [useExisting, setUseExisting] = useState(false);

  // rowId เป็น key ที่คงที่ตลอดของแต่ละแถว PLO (คนละตัวกับ code ที่แก้ไขได้) - เหมือนแพทเทิร์น cloRows
  // ของ AdminCourseImportMCO3.jsx
  const ploRowIdRef = useRef(0);
  const [ploRows, setPloRows] = useState([]);

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveResult, setSaveResult] = useState(null);

  const existingPloCodeSet = useMemo(() => new Set(existingPloCodes), [existingPloCodes]);

  function resetReviewState() {
    setExtracted(false);
    setFlags([]);
    setCurriculumName("");
    setCurriculumYear("");
    setExistingCurriculumId(null);
    setExistingPloCodes([]);
    setUseExisting(false);
    setPloRows([]);
    setFormError("");
    setSaveError("");
    setSaveResult(null);
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
    if (!file) return;
    setExtracting(true);
    setExtractError("");
    try {
      const result = await importCurriculumFromMco2(file);
      setCurriculumName(result.curriculum_name || "");
      setCurriculumYear(result.curriculum_year != null ? String(result.curriculum_year) : "");
      setFlags(result.flags || []);
      setExistingCurriculumId(result.existing_curriculum_id ?? null);
      setExistingPloCodes(result.existing_plo_codes || []);
      // เจอหลักสูตรเดิมที่ชื่อ+ปีตรงกัน - default ไปโหมด "เพิ่ม/อัปเดตเข้าหลักสูตรเดิม" ให้อัตโนมัติ
      setUseExisting(result.existing_curriculum_id != null);

      const rows = (result.plos || []).map((plo) => ({
        rowId: ploRowIdRef.current++,
        code: plo.code || "",
        descriptionTh: plo.description_th || "",
        descriptionEn: plo.description_en || "",
        category: plo.category || "",
      }));
      setPloRows(rows);
      setExtracted(true);
    } catch (err) {
      setExtractError(
        err?.response?.data?.detail || "วิเคราะห์เอกสารไม่สำเร็จ ลองใหม่อีกครั้ง หรือตรวจสอบว่าเป็นไฟล์ มคอ.2 จริง"
      );
    } finally {
      setExtracting(false);
    }
  }

  function updatePloRow(rowId, field, value) {
    setPloRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r)));
  }

  function addPloRow() {
    setPloRows((prev) => [
      ...prev,
      { rowId: ploRowIdRef.current++, code: "", descriptionTh: "", descriptionEn: "", category: "" },
    ]);
  }

  function removePloRow(rowId) {
    setPloRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  // ตรวจทุกแถว/ทุกเงื่อนไขก่อนยิง request เดียวไป Phase 2 (ซึ่งเช็คซ้ำอีกชั้นฝั่ง backend อยู่แล้ว) -
  // เช็คฝั่ง frontend ก่อนแค่เพื่อ feedback เร็วกว่ารอ 400 กลับมา ไม่ใช่แหล่งความจริง
  async function handleSave() {
    setFormError("");
    setSaveError("");

    if (!curriculumName.trim()) {
      setFormError("กรุณากรอกชื่อหลักสูตร");
      return;
    }
    const parsedYear = Number(curriculumYear);
    if (!Number.isInteger(parsedYear) || parsedYear <= 0) {
      setFormError('"ปีหลักสูตร" ต้องเป็นจำนวนเต็มมากกว่า 0');
      return;
    }
    if (ploRows.length === 0) {
      setFormError("ต้องมี PLO อย่างน้อย 1 ข้อ");
      return;
    }
    const trimmedCodes = ploRows.map((r) => r.code.trim());
    if (trimmedCodes.some((c) => !c)) {
      setFormError("ทุกแถว PLO ต้องมีรหัส (เช่น PLO1)");
      return;
    }
    if (new Set(trimmedCodes).size !== trimmedCodes.length) {
      setFormError("รหัส PLO ซ้ำกันภายในคำขอนี้ - แก้ให้รหัสไม่ซ้ำก่อนบันทึก");
      return;
    }
    if (ploRows.some((r) => !r.category)) {
      setFormError("ทุกแถว PLO ต้องเลือกหมวดหมู่ก่อนบันทึก");
      return;
    }

    const payload = {
      curriculum_id: useExisting ? existingCurriculumId : null,
      curriculum_name: curriculumName.trim(),
      curriculum_year: parsedYear,
      plos: ploRows.map((r) => ({
        code: r.code.trim(),
        description_th: r.descriptionTh.trim(),
        description_en: r.descriptionEn.trim() || null,
        category: r.category,
      })),
    };

    setSaving(true);
    try {
      const result = await saveCurriculumFromMco2(payload);
      setSaveResult(result);
    } catch (err) {
      setSaveError(err?.response?.data?.detail || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  const canExtract = file && !extracting;
  const showReviewForm = extracted && !saveResult;

  return (
    <div className="page">
      <h1>นำเข้าหลักสูตร/PLO จาก มคอ.2 ด้วย AI</h1>
      <p className="admin-home-intro">
        อัปโหลดไฟล์ มคอ.2 (.pdf หรือ .docx) ระบบจะใช้ AI แกะชื่อ/ปีหลักสูตร และรายการ PLO ออกมาให้
        ตรวจสอบและแก้ไขได้ทุกฟิลด์ก่อนเสมอ - จะไม่มีอะไรถูกบันทึกลงระบบจนกว่าจะกด "ยืนยันบันทึก" ด้านล่าง
      </p>

      <div className="workspace-section">
        <h2>
          <Upload size={18} strokeWidth={2} /> เลือกไฟล์
        </h2>
        <div className="workspace-inline-form">
          <input key={fileInputKey} type="file" accept=".pdf,.docx" onChange={handleFileChange} />
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
        {extracting && (
          <p className="workspace-hint-inline">กำลังวิเคราะห์เอกสารด้วย AI... อาจใช้เวลาถึง 1 นาที</p>
        )}
        {extractError && <p className="error-message">{extractError}</p>}
      </div>

      {showReviewForm && (
        <>
          <FlagList flags={flags} />

          {existingCurriculumId != null && (
            <div className="mco2-existing-banner">
              <Info size={16} strokeWidth={2} style={{ verticalAlign: "-3px", marginRight: "6px" }} />
              พบหลักสูตรที่ชื่อ+ปีตรงกันอยู่แล้วในระบบ (curriculum_id={existingCurriculumId}) - ค่าเริ่มต้น
              คือเพิ่ม/อัปเดต PLO เข้าหลักสูตรเดิมนี้ (รหัส PLO ที่ตรงกับที่มีอยู่แล้วจะถูกอัปเดต รหัสใหม่จะ
              ถูกเพิ่ม) ถ้าไม่ต้องการแบบนี้ (เช่นชื่อพ้องกันโดยบังเอิญ) ยกเลิกติ๊กด้านล่างเพื่อสร้างหลักสูตร
              ใหม่แยกต่างหากแทน
              <label style={{ display: "block", marginTop: "8px" }}>
                <input
                  type="checkbox"
                  checked={useExisting}
                  onChange={(e) => setUseExisting(e.target.checked)}
                  style={{ marginRight: "6px" }}
                />
                เพิ่ม/อัปเดต PLO เข้าหลักสูตรเดิม (curriculum_id={existingCurriculumId})
              </label>
            </div>
          )}

          <div className="workspace-section">
            <h2>ข้อมูลหลักสูตร</h2>
            <div className="workspace-inline-form">
              <div className="form-field">
                <label htmlFor="mco2-curriculum-name">ชื่อหลักสูตร</label>
                <input
                  id="mco2-curriculum-name"
                  type="text"
                  value={curriculumName}
                  onChange={(e) => setCurriculumName(e.target.value)}
                  disabled={useExisting}
                />
              </div>
              <div className="form-field">
                <label htmlFor="mco2-curriculum-year">ปีหลักสูตร (พ.ศ.)</label>
                <input
                  id="mco2-curriculum-year"
                  type="number"
                  step="1"
                  min="1"
                  value={curriculumYear}
                  onChange={(e) => setCurriculumYear(e.target.value)}
                  disabled={useExisting}
                />
              </div>
            </div>
            {useExisting && (
              <p className="workspace-hint-inline">
                กำลังใช้หลักสูตรเดิม (curriculum_id={existingCurriculumId}) - ชื่อ/ปีของหลักสูตรเดิมจะไม่
                ถูกแก้ไข แก้ได้แค่รายการ PLO ด้านล่างเท่านั้น
              </p>
            )}
          </div>

          <div className="workspace-section">
            <h2>PLO ({ploRows.length} ข้อ)</h2>
            {ploRows.map((row) => {
              const trimmedCode = row.code.trim();
              const isUpdate = useExisting && trimmedCode && existingPloCodeSet.has(trimmedCode);
              return (
                <div key={row.rowId} className="mco3-clo-row">
                  <div className="mco3-clo-row-fields">
                    <div className="form-field">
                      <label htmlFor={`mco2-plo-code-${row.rowId}`}>
                        รหัส PLO
                        {useExisting && trimmedCode && (
                          <span
                            className={`mco2-plo-row-badge ${
                              isUpdate ? "mco2-plo-row-badge-update" : "mco2-plo-row-badge-new"
                            }`}
                          >
                            {isUpdate ? "จะอัปเดต" : "จะสร้างใหม่"}
                          </span>
                        )}
                      </label>
                      <input
                        id={`mco2-plo-code-${row.rowId}`}
                        type="text"
                        value={row.code}
                        onChange={(e) => updatePloRow(row.rowId, "code", e.target.value)}
                      />
                    </div>
                    <div className="form-field form-field-grow">
                      <label htmlFor={`mco2-plo-desc-th-${row.rowId}`}>คำอธิบาย (ไทย)</label>
                      <input
                        id={`mco2-plo-desc-th-${row.rowId}`}
                        type="text"
                        value={row.descriptionTh}
                        onChange={(e) => updatePloRow(row.rowId, "descriptionTh", e.target.value)}
                      />
                    </div>
                    <div className="form-field form-field-grow">
                      <label htmlFor={`mco2-plo-desc-en-${row.rowId}`}>คำอธิบาย (อังกฤษ)</label>
                      <input
                        id={`mco2-plo-desc-en-${row.rowId}`}
                        type="text"
                        value={row.descriptionEn}
                        onChange={(e) => updatePloRow(row.rowId, "descriptionEn", e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor={`mco2-plo-category-${row.rowId}`}>หมวดหมู่</label>
                      <select
                        id={`mco2-plo-category-${row.rowId}`}
                        value={row.category}
                        onChange={(e) => updatePloRow(row.rowId, "category", e.target.value)}
                      >
                        {PLO_CATEGORY_OPTIONS.map((o) => (
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
                      onClick={() => removePloRow(row.rowId)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
            <button type="button" onClick={addPloRow}>
              + เพิ่ม PLO
            </button>
          </div>

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
            <CheckCircle2 size={16} strokeWidth={2} /> บันทึกสำเร็จ: {saveResult.curriculum.name} (
            {saveResult.curriculum.year}) - สร้างใหม่ {saveResult.created_plo_codes.length} PLO, อัปเดต{" "}
            {saveResult.updated_plo_codes.length} PLO - เลือกไฟล์อื่นด้านบนเพื่อนำเข้าหลักสูตรต่อไป
          </p>
        </div>
      )}
    </div>
  );
}
