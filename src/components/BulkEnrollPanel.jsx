import { useEffect, useMemo, useState } from "react";
import { Users, Upload } from "lucide-react";
import {
  listEnrollments,
  getSiblingSectionEnrollments,
  bulkEnrollStudents,
  bulkEnrollUpload,
} from "../api/client.js";

/**
 * แผงลงทะเบียนแบบกลุ่มเข้าวิชาที่เปิดสอนหนึ่งวิชา (ติ๊กเลือกหลายคนพร้อมกัน + อัปโหลดไฟล์
 * .csv/.xlsx) - ย้ายมาจาก EnrollmentTab ใน CourseOfferingWorkspace.jsx เพื่อใช้ร่วมกับหน้า
 * AdminEnrollments.jsx ได้ด้วย (logic เดิมไม่เปลี่ยน แค่แยกเป็น component ของตัวเอง)
 *
 * ดึงรายชื่อที่ลงทะเบียนวิชานี้ไปแล้ว (listEnrollments) และคนที่ลงทะเบียนวิชาเดียวกันไปแล้วที่
 * หมู่/section อื่น (getSiblingSectionEnrollments) เองภายในจาก offeringId - ผู้เรียกส่งแค่
 * offeringId, allStudents (รายชื่อนักศึกษาทั้งหมดในระบบแบบดิบ ไม่ต้องกรองมาก่อน) และ onChanged
 * (เรียกหลังลงทะเบียนสำเร็จ เผื่อผู้เรียกต้อง refresh ข้อมูลของตัวเอง)
 */
export default function BulkEnrollPanel({ offeringId, allStudents, onChanged }) {
  const [enrolledIds, setEnrolledIds] = useState(() => new Set());
  const [otherSectionMap, setOtherSectionMap] = useState({});

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [multiSubmitting, setMultiSubmitting] = useState(false);
  const [multiError, setMultiError] = useState("");
  const [multiResultMessage, setMultiResultMessage] = useState("");

  const [uploadFile, setUploadFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadResult, setUploadResult] = useState(null);

  function refreshRoster() {
    listEnrollments(offeringId)
      .then((rows) => setEnrolledIds(new Set(rows.map((e) => e.student_id))))
      .catch(() => {});
    getSiblingSectionEnrollments(offeringId)
      .then((rows) => {
        const map = {};
        rows.forEach((r) => (map[r.student_id] = r.section));
        setOtherSectionMap(map);
      })
      .catch(() => {});
  }

  useEffect(() => {
    setSelectedIds(new Set());
    setEnrolledIds(new Set());
    setOtherSectionMap({});
    setMultiError("");
    setMultiResultMessage("");
    setUploadError("");
    setUploadResult(null);
    refreshRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeringId]);

  // รายชื่อนักศึกษาที่ยังไม่ได้ลงทะเบียนวิชานี้ และไม่ได้ลงทะเบียนวิชาเดียวกันไปแล้วที่หมู่อื่น
  const availableStudents = useMemo(
    () => allStudents.filter((s) => !enrolledIds.has(s.id) && !otherSectionMap[s.id]),
    [allStudents, enrolledIds, otherSectionMap]
  );

  // แสดงแยกต่างหาก (ไม่ปนกับ availableStudents) เพื่อให้เห็นชัดว่าใครลงทะเบียนวิชานี้ไปแล้วที่หมู่ไหน
  const otherSectionAvailableStudents = useMemo(
    () => allStudents.filter((s) => !enrolledIds.has(s.id) && otherSectionMap[s.id]),
    [allStudents, enrolledIds, otherSectionMap]
  );

  const allVisibleSelected =
    availableStudents.length > 0 && availableStudents.every((s) => selectedIds.has(s.id));

  function toggleOne(studentId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        availableStudents.forEach((s) => next.delete(s.id));
        return next;
      }
      const next = new Set(prev);
      availableStudents.forEach((s) => next.add(s.id));
      return next;
    });
  }

  async function handleAddSelected() {
    if (selectedIds.size === 0) return;
    setMultiSubmitting(true);
    setMultiError("");
    setMultiResultMessage("");
    try {
      const result = await bulkEnrollStudents(offeringId, Array.from(selectedIds));
      setMultiResultMessage(
        `เพิ่มสำเร็จ ${result.added_count} คน${
          result.already_enrolled.length > 0 ? `, ข้าม ${result.already_enrolled.length} คน` : ""
        }${
          result.already_in_other_section.length > 0
            ? `, ข้าม ${result.already_in_other_section.length} คนที่อยู่หมู่อื่นของวิชานี้แล้ว`
            : ""
        }`
      );
      setSelectedIds(new Set());
      refreshRoster();
      await onChanged();
    } catch (err) {
      setMultiError(err?.response?.data?.detail || "เพิ่มนักศึกษาที่เลือกไม่สำเร็จ");
    } finally {
      setMultiSubmitting(false);
    }
  }

  function handleFileChange(e) {
    setUploadFile(e.target.files?.[0] ?? null);
    setUploadResult(null);
    setUploadError("");
  }

  async function handleUpload() {
    if (!uploadFile) return;
    setUploadSubmitting(true);
    setUploadError("");
    setUploadResult(null);
    try {
      const result = await bulkEnrollUpload(offeringId, uploadFile);
      setUploadResult(result);
      setUploadFile(null);
      setFileInputKey((k) => k + 1);
      refreshRoster();
      await onChanged();
    } catch (err) {
      setUploadError(err?.response?.data?.detail || "อัปโหลดไฟล์ไม่สำเร็จ");
    } finally {
      setUploadSubmitting(false);
    }
  }

  return (
    <>
      <div className="workspace-section">
        <h2>
          <Users size={18} strokeWidth={2} /> เลือกหลายคนพร้อมกัน
        </h2>
        {multiError && <p className="error-message">{multiError}</p>}
        <div className="workspace-inline-form">
          <button type="button" onClick={toggleSelectAllVisible} disabled={availableStudents.length === 0}>
            {allVisibleSelected ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
          </button>
        </div>
        <div className="enroll-multiselect-list">
          {availableStudents.map((s) => (
            <label key={s.id} className="enroll-multiselect-item">
              <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleOne(s.id)} />
              {s.id} {s.first_name} {s.last_name}
            </label>
          ))}
          {availableStudents.length === 0 && (
            <p className="student-list-empty">ไม่พบนักศึกษาที่ยังไม่ได้ลงทะเบียน</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleAddSelected}
          disabled={selectedIds.size === 0 || multiSubmitting}
        >
          {multiSubmitting ? "กำลังเพิ่ม..." : `เพิ่มที่เลือก (${selectedIds.size} คน)`}
        </button>
        {multiResultMessage && <p className="success-message">{multiResultMessage}</p>}

        {otherSectionAvailableStudents.length > 0 && (
          <div className="enroll-other-section-note">
            <p className="workspace-hint-inline">
              นักศึกษาที่ลงทะเบียนวิชานี้ไปแล้วที่หมู่อื่น ({otherSectionAvailableStudents.length} คน —
              ไม่แสดงในรายการด้านบนเพื่อไม่ให้เพิ่มซ้ำ):
            </p>
            <ul className="enroll-other-section-list">
              {otherSectionAvailableStudents.map((s) => (
                <li key={s.id}>
                  {s.id} {s.first_name} {s.last_name} — หมู่ {otherSectionMap[s.id]}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="workspace-section">
        <h2>
          <Upload size={18} strokeWidth={2} /> อัปโหลดไฟล์รายชื่อ (.csv, .xlsx)
        </h2>
        {uploadError && <p className="error-message">{uploadError}</p>}
        <div className="workspace-inline-form">
          <input key={fileInputKey} type="file" accept=".csv,.xlsx" onChange={handleFileChange} />
          <button type="button" onClick={handleUpload} disabled={!uploadFile || uploadSubmitting}>
            {uploadSubmitting ? "กำลังอัปโหลด..." : "อัปโหลดและลงทะเบียน"}
          </button>
        </div>
        {uploadResult && (
          <div className="upload-result">
            <p className="success-message">
              เพิ่มสำเร็จ {uploadResult.added_count} คน
              {uploadResult.already_enrolled.length > 0 &&
                `, ข้าม (ลงทะเบียนแล้ว) ${uploadResult.already_enrolled.length} คน`}
              {uploadResult.already_in_other_section.length > 0 &&
                `, ข้าม (อยู่หมู่อื่นของวิชานี้แล้ว) ${uploadResult.already_in_other_section.length} คน`}
              {uploadResult.not_found.length > 0 && `, ไม่พบในระบบ ${uploadResult.not_found.length} คน`}
              {uploadResult.wrong_curriculum.length > 0 &&
                `, คนละหลักสูตร ${uploadResult.wrong_curriculum.length} คน`}
            </p>
            {uploadResult.not_found.length > 0 && (
              <div className="upload-result-list">
                <label>รหัสที่ไม่พบในระบบ (คัดลอกไปตรวจสอบได้):</label>
                <textarea readOnly value={uploadResult.not_found.join(", ")} onClick={(e) => e.target.select()} />
              </div>
            )}
            {uploadResult.wrong_curriculum.length > 0 && (
              <div className="upload-result-list">
                <label>รหัสที่อยู่คนละหลักสูตรกับวิชานี้ (ไม่ได้ลงทะเบียนให้):</label>
                <textarea
                  readOnly
                  value={uploadResult.wrong_curriculum.join(", ")}
                  onClick={(e) => e.target.select()}
                />
              </div>
            )}
            {uploadResult.already_in_other_section.length > 0 && (
              <div className="upload-result-list">
                <label>รหัสที่ลงทะเบียนวิชานี้ไปแล้วที่หมู่อื่น (ไม่ได้เพิ่มซ้ำให้):</label>
                <textarea
                  readOnly
                  value={uploadResult.already_in_other_section
                    .map((c) => `${c.student_id} (หมู่ ${c.section})`)
                    .join(", ")}
                  onClick={(e) => e.target.select()}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
