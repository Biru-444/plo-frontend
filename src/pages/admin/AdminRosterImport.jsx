/**
 * ทำอะไร : หน้านำเข้ารายชื่อนักศึกษาจากไฟล์ Excel ของมหาวิทยาลัย (route /admin/roster-import) —
 *          บังคับ preview (dry-run) ก่อนบันทึกจริงเสมอ 2 ขั้นตอน: เลือกไฟล์ -> ดูตัวอย่างผลลัพธ์ที่
 *          "จะ" เกิดขึ้น -> กดยืนยันเพื่อบันทึกจริง (เรียก API เดิมซ้ำด้วยไฟล์เดิม แค่เปลี่ยน dryRun)
 *
 * เชื่อมกับ : เรียก importRoster(file, dryRun) จาก api/client.js — backend endpoint เดียวกันรองรับทั้ง
 *             โหมด preview และบันทึกจริงผ่าน form field เดียว (ดู POST /roster-import ฝั่ง backend)
 *
 * ถ้าแก้ : รหัสผ่านชั่วคราวของบัญชีอาจารย์ที่สร้างใหม่ (new_instructor_credentials) แสดงได้ครั้งเดียว
 *          ตอนนี้เท่านั้น (backend ไม่เก็บ plain text ไว้ให้ดูซ้ำ) — เตือนผู้ใช้ให้คัดลอกไว้ก่อนออกจากหน้า
 */
import { useState } from "react";
import { FileSpreadsheet, Upload, AlertTriangle, CheckCircle2, KeyRound } from "lucide-react";
import { importRoster } from "../../api/client.js";

// ป้ายสถานะที่ backend ส่งกลับ (offering_action) แปลเป็นข้อความไทยที่ผู้ใช้เข้าใจง่ายกว่า
const OFFERING_ACTION_LABEL = {
  matched_existing: "มีอยู่แล้ว - จะใช้อันเดิม",
  will_create: "ยังไม่มี - จะสร้างใหม่",
  created: "สร้างใหม่แล้ว",
  error: "ไม่พบวิชา",
};

const INSTRUCTOR_ACTION_LABEL = {
  matched_existing: "มีบัญชีอยู่แล้ว",
  will_create: "ยังไม่มีบัญชี - จะสร้างใหม่",
  created: "สร้างบัญชีใหม่แล้ว",
};

const STUDENT_ACTION_LABEL = {
  create: "นักศึกษาใหม่ - จะสร้าง",
  update_info: "ชื่อ/หมู่ไม่ตรง - จะแก้ตามไฟล์",
  unchanged: "มีอยู่แล้ว ชื่อ+หมู่ตรงกัน",
  error: "ข้าม (ดูรายละเอียด)",
};

// สีป้ายสถานะ - เขียว = ไม่ต้องทำอะไร/เสร็จแล้ว, ส้ม = จะมีการเปลี่ยนแปลงเกิดขึ้น, แดง = มีปัญหาต้องดู
function actionBadgeClass(action) {
  if (action === "created" || action === "unchanged" || action === "matched_existing") {
    return "roster-badge roster-badge-green";
  }
  if (action === "will_create" || action === "create" || action === "update_info") {
    return "roster-badge roster-badge-orange";
  }
  if (action === "error") {
    return "roster-badge roster-badge-red";
  }
  return "roster-badge";
}

// แสดงผลลัพธ์ 1 ชุด (ใช้ได้ทั้งตอน preview และหลังบันทึกจริง - โครงสร้างข้อมูลเหมือนกันทุกประการ)
function ResultPanel({ result }) {
  const s = result.summary || {};
  return (
    <div className="roster-result">
      <div className="workspace-section">
        <h2>
          <FileSpreadsheet size={18} strokeWidth={2} />
          {result.course_found ? `${result.course_code} ${result.course_name_th || ""}` : result.course_code}
        </h2>
        {result.course_found ? (
          <div className="roster-info-grid">
            <div>
              <label>ปีการศึกษา / ภาคเรียน</label>
              <span>
                {result.academic_year} / {result.semester}
              </span>
            </div>
            <div>
              <label>Section</label>
              <span>{result.section}</span>
            </div>
            <div>
              <label>รุ่นนักศึกษา (cohort_year)</label>
              <span>{result.cohort_year ?? "-"}</span>
            </div>
            <div>
              <label>การเปิดสอน (course_offering)</label>
              <span className={actionBadgeClass(result.offering_action)}>
                {OFFERING_ACTION_LABEL[result.offering_action] || result.offering_action}
              </span>
            </div>
          </div>
        ) : (
          <p className="error-message">ไม่พบวิชานี้ในระบบ - ดูรายละเอียดด้านล่าง</p>
        )}

        {result.errors?.length > 0 && (
          <div className="roster-errors">
            {result.errors.map((e, i) => (
              <p key={i} className="error-message">
                <AlertTriangle size={14} strokeWidth={2} /> {e}
              </p>
            ))}
          </div>
        )}
      </div>

      {result.instructors?.length > 0 && (
        <div className="workspace-section">
          <h2>ผู้สอน</h2>
          <table className="crud-table">
            <thead>
              <tr>
                <th>ชื่อในไฟล์</th>
                <th>คำนำหน้า</th>
                <th>สถานะ</th>
                <th>Username</th>
              </tr>
            </thead>
            <tbody>
              {result.instructors.map((ins, i) => (
                <tr key={i}>
                  <td>{ins.full_name}</td>
                  <td>{ins.title || "-"}</td>
                  <td>
                    <span className={actionBadgeClass(ins.action)}>
                      {INSTRUCTOR_ACTION_LABEL[ins.action] || ins.action}
                    </span>
                  </td>
                  <td>{ins.username || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="workspace-hint-inline">
            ใช้ผู้สอนคนแรกในไฟล์เป็นผู้สอนหลักของวิชานี้ (course_offering รองรับผู้สอนคนเดียว) —
            ถ้ามีผู้สอนร่วมหลายคน ระบบจะสร้าง/จับคู่บัญชีให้ครบทุกคนไว้ก่อน แต่ผูกกับวิชาเฉพาะคนแรก
          </p>
        </div>
      )}

      {result.new_instructor_credentials?.length > 0 && (
        <div className="workspace-section roster-credentials-box">
          <h2>
            <KeyRound size={18} strokeWidth={2} /> บัญชีอาจารย์ที่สร้างใหม่ (แสดงรหัสผ่านครั้งนี้ครั้งเดียว)
          </h2>
          <p className="error-message">กรุณาคัดลอก/จดไว้ก่อนออกจากหน้านี้ - ระบบไม่เก็บรหัสผ่านนี้ไว้ให้ดูซ้ำ</p>
          <table className="crud-table">
            <thead>
              <tr>
                <th>ชื่อ-นามสกุล</th>
                <th>Username</th>
                <th>รหัสผ่านชั่วคราว</th>
              </tr>
            </thead>
            <tbody>
              {result.new_instructor_credentials.map((c, i) => (
                <tr key={i}>
                  <td>{c.full_name}</td>
                  <td>{c.username}</td>
                  <td>
                    <code>{c.temp_password}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.students?.length > 0 && (
        <div className="workspace-section">
          <h2>รายชื่อนักศึกษา ({result.students.length} คน)</h2>
          <p className="workspace-hint-inline">
            นักศึกษาใหม่ {s.students_create ?? 0} คน · แก้ชื่อ/หมู่ {s.students_update_info ?? 0} คน · ตรงอยู่แล้ว{" "}
            {s.students_unchanged ?? 0} คน · ข้าม {s.students_error ?? 0} คน · ลงทะเบียนเพิ่ม{" "}
            {result.enrollments_added} คน · ลงทะเบียนอยู่แล้ว {result.enrollments_already} คน
          </p>
          <table className="student-table">
            <thead>
              <tr>
                <th>เลขที่</th>
                <th>รหัสนักศึกษา</th>
                <th>ชื่อ-นามสกุล</th>
                <th>สถานะ</th>
                <th>รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {result.students.map((row) => (
                <tr key={row.student_id} className="student-table-row">
                  <td className="student-table-cell">{row.line_no}</td>
                  <td className="student-table-cell">{row.student_id}</td>
                  <td className="student-table-cell">
                    {row.title || ""} {row.first_name} {row.last_name}
                  </td>
                  <td className="student-table-cell">
                    <span className={actionBadgeClass(row.action)}>
                      {STUDENT_ACTION_LABEL[row.action] || row.action}
                    </span>
                  </td>
                  <td className="student-table-cell roster-detail-cell">{row.detail || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminRosterImport() {
  const [file, setFile] = useState(null);
  // เปลี่ยนค่านี้เพื่อบังคับให้ <input type="file"> รีเซ็ตตัวเอง (React ไม่ยอมให้ set value ของ
  // input ไฟล์ตรงๆ ได้ วิธีเดียวคือเปลี่ยน key เพื่อ mount ใหม่)
  const [fileInputKey, setFileInputKey] = useState(0);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState(null);
  const [commitError, setCommitError] = useState("");

  // เลือกไฟล์ใหม่ -> เคลียร์ผลลัพธ์เก่าทั้งหมด แล้วยิง dry-run ทันทีเพื่อแสดง preview
  async function handleFileChange(e) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(null);
    setPreviewError("");
    setCommitResult(null);
    setCommitError("");
    if (!f) return;
    setPreviewLoading(true);
    try {
      const result = await importRoster(f, true);
      setPreview(result);
    } catch (err) {
      setPreviewError(err?.response?.data?.detail || "อ่านไฟล์ไม่สำเร็จ - ตรวจสอบว่าเป็นไฟล์รายชื่อจากมหาวิทยาลัยจริง");
    } finally {
      setPreviewLoading(false);
    }
  }

  // กดยืนยัน -> เรียก importRoster ซ้ำด้วยไฟล์เดิม แต่เปลี่ยน dryRun เป็น false เพื่อบันทึกจริง
  async function handleConfirmImport() {
    if (!file) return;
    setCommitting(true);
    setCommitError("");
    try {
      const result = await importRoster(file, false);
      setCommitResult(result);
    } catch (err) {
      setCommitError(err?.response?.data?.detail || "นำเข้าไม่สำเร็จ");
    } finally {
      setCommitting(false);
    }
  }

  // ล้างสถานะทั้งหมดกลับไปเริ่มใหม่ (เลือกไฟล์อื่น)
  function handleReset() {
    setFile(null);
    setPreview(null);
    setPreviewError("");
    setCommitResult(null);
    setCommitError("");
    setFileInputKey((k) => k + 1);
  }

  // แสดงผลบันทึกจริงถ้ามี (commitResult) ไม่งั้นแสดง preview - ปุ่ม "ยืนยันนำเข้าจริง" กดได้เฉพาะตอน
  // เจอวิชาในระบบแล้ว (course_found) และยังไม่เคยบันทึกจริงไปแล้วรอบนี้
  const shown = commitResult || preview;
  const canConfirm = preview && preview.course_found && !commitResult;

  return (
    <div className="page">
      <h1>นำเข้ารายชื่อจากไฟล์ Excel มหาวิทยาลัย</h1>
      <p className="admin-home-intro">
        อัปโหลดไฟล์ .xls ที่มหาวิทยาลัยส่งให้อาจารย์ (รายชื่อนักศึกษาลงทะเบียนต่อวิชา/section) ระบบจะอ่านวิชา/
        ภาคเรียน/ผู้สอน/รายชื่อนักศึกษาจากไฟล์เอง แล้วแสดงตัวอย่างผลลัพธ์ก่อนบันทึกจริงเสมอ - จะไม่มีอะไรถูกบันทึก
        จนกว่าจะกด "ยืนยันนำเข้าจริง"
      </p>

      <div className="workspace-section">
        <h2>
          <Upload size={18} strokeWidth={2} /> เลือกไฟล์
        </h2>
        <div className="workspace-inline-form">
          <input key={fileInputKey} type="file" accept=".xls,.xlsx" onChange={handleFileChange} />
          {(preview || commitResult) && (
            <button type="button" onClick={handleReset}>
              เลือกไฟล์อื่น
            </button>
          )}
        </div>
        {previewLoading && <p className="workspace-hint-inline">กำลังอ่านไฟล์...</p>}
        {previewError && <p className="error-message">{previewError}</p>}
      </div>

      {shown && <ResultPanel result={shown} />}

      {canConfirm && (
        <div className="workspace-section">
          {commitError && <p className="error-message">{commitError}</p>}
          <button type="button" onClick={handleConfirmImport} disabled={committing}>
            {committing ? "กำลังบันทึก..." : "ยืนยันนำเข้าจริง"}
          </button>
        </div>
      )}

      {commitResult && (
        <div className="workspace-section">
          <p className="success-message">
            <CheckCircle2 size={16} strokeWidth={2} /> นำเข้าเสร็จสมบูรณ์ - เลือกไฟล์อื่นด้านบนเพื่อนำเข้าต่อ
          </p>
        </div>
      )}
    </div>
  );
}
