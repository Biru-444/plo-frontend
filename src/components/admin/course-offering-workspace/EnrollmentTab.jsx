import { useEffect, useMemo, useState } from "react";
import { Search, Trash2, Users } from "lucide-react";
import BulkEnrollPanel from "../../BulkEnrollPanel.jsx";
import {
  createEnrollment,
  deleteEnrollment,
  bulkEnrollByCohort,
  bulkRemoveByCohort,
  getSiblingSectionEnrollments,
} from "../../../api/client.js";

export default function EnrollmentTab({ offeringId, curriculumId, enrollments, studentById, allStudents, onChanged }) {
  const [addSearch, setAddSearch] = useState("");
  const [addStudentId, setAddStudentId] = useState("");
  const [addError, setAddError] = useState("");
  const [removeError, setRemoveError] = useState("");

  const [cohortYear, setCohortYear] = useState("");
  const [cohortSubmitting, setCohortSubmitting] = useState(false);
  const [cohortError, setCohortError] = useState("");
  const [cohortResultMessage, setCohortResultMessage] = useState("");

  const [removeCohortYear, setRemoveCohortYear] = useState("");
  const [removeCohortSubmitting, setRemoveCohortSubmitting] = useState(false);
  const [removeCohortError, setRemoveCohortError] = useState("");
  const [removeCohortResultMessage, setRemoveCohortResultMessage] = useState("");

  // รายชื่อนักศึกษาที่ลงทะเบียนวิชานี้ไปแล้วในหมู่/section อื่น (วิชาเดียวกัน ภาคเรียนเดียวกัน)
  // ใช้แยกไม่ให้ปนกับคนที่ยังไม่ได้ลงทะเบียนเลย เช่น รุ่น 69 ที่แบ่งเป็น 2 หมู่เพราะคนเยอะ
  const [otherSectionMap, setOtherSectionMap] = useState({});

  useEffect(() => {
    let cancelled = false;
    setOtherSectionMap({});
    getSiblingSectionEnrollments(offeringId)
      .then((rows) => {
        if (cancelled) return;
        const map = {};
        rows.forEach((r) => (map[r.student_id] = r.section));
        setOtherSectionMap(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [offeringId]);

  const enrolledRoster = useMemo(
    () =>
      enrollments
        .map((e) => ({ enrollment: e, student: studentById[e.student_id] }))
        .filter((r) => r.student)
        .sort((a, b) => a.student.id.localeCompare(b.student.id)),
    [enrollments, studentById]
  );

  const enrolledIds = useMemo(() => new Set(enrollments.map((e) => e.student_id)), [enrollments]);

  const availableStudents = useMemo(() => {
    const candidates = allStudents.filter((s) => !enrolledIds.has(s.id) && !otherSectionMap[s.id]);
    if (!addSearch.trim()) return candidates;
    const q = addSearch.trim().toLowerCase();
    return candidates.filter(
      (s) => s.id.toLowerCase().includes(q) || `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)
    );
  }, [allStudents, enrolledIds, otherSectionMap, addSearch]);

  const cohortOptions = useMemo(() => {
    const years = new Set(
      allStudents.filter((s) => s.curriculum_id === curriculumId).map((s) => s.cohort_year)
    );
    return Array.from(years).sort((a, b) => a - b);
  }, [allStudents, curriculumId]);

  const cohortCandidates = useMemo(() => {
    if (!cohortYear) return [];
    return allStudents.filter(
      (s) =>
        s.curriculum_id === curriculumId &&
        s.cohort_year === Number(cohortYear) &&
        !enrolledIds.has(s.id)
    );
  }, [allStudents, curriculumId, cohortYear, enrolledIds]);

  const cohortOtherSectionStudents = useMemo(
    () => cohortCandidates.filter((s) => otherSectionMap[s.id]),
    [cohortCandidates, otherSectionMap]
  );

  const cohortPreviewCount = useMemo(
    () => cohortCandidates.filter((s) => !otherSectionMap[s.id]).length,
    [cohortCandidates, otherSectionMap]
  );

  // รุ่นที่มีนักศึกษาลงทะเบียนวิชานี้อยู่จริง - ใช้เป็นตัวเลือกสำหรับ "ลบรายชื่อทั้งรุ่น"
  const enrolledCohortOptions = useMemo(() => {
    const years = new Set(
      enrolledRoster.map(({ student }) => student.cohort_year).filter((y) => y != null)
    );
    return Array.from(years).sort((a, b) => a - b);
  }, [enrolledRoster]);

  const removeCohortCandidates = useMemo(() => {
    if (!removeCohortYear) return [];
    return enrolledRoster.filter(({ student }) => student.cohort_year === Number(removeCohortYear));
  }, [enrolledRoster, removeCohortYear]);

  async function handleBulkByCohort() {
    if (!cohortYear) return;
    if (
      !window.confirm(
        `ยืนยันเพิ่มนักศึกษารุ่น ${cohortYear} ทั้งหมด ${cohortPreviewCount} คน เข้าวิชานี้?`
      )
    )
      return;
    setCohortSubmitting(true);
    setCohortError("");
    setCohortResultMessage("");
    try {
      const result = await bulkEnrollByCohort(offeringId, Number(cohortYear));
      setCohortResultMessage(
        `เพิ่มสำเร็จ ${result.added_count} คน${
          result.already_enrolled_count > 0 ? ` (ข้าม ${result.already_enrolled_count} คนที่ลงทะเบียนแล้ว)` : ""
        }${
          result.already_in_other_section.length > 0
            ? ` (ข้าม ${result.already_in_other_section.length} คนที่อยู่หมู่อื่นของวิชานี้แล้ว)`
            : ""
        }`
      );
      await onChanged();
    } catch (err) {
      setCohortError(err?.response?.data?.detail || "เพิ่มนักศึกษารุ่นนี้ไม่สำเร็จ");
    } finally {
      setCohortSubmitting(false);
    }
  }

  async function handleBulkRemoveByCohort() {
    if (!removeCohortYear) return;
    if (
      !window.confirm(
        `ยืนยันลบนักศึกษารุ่น ${removeCohortYear} ทั้งหมด ${removeCohortCandidates.length} คน ออกจากวิชานี้? การกระทำนี้ย้อนกลับไม่ได้`
      )
    )
      return;
    setRemoveCohortSubmitting(true);
    setRemoveCohortError("");
    setRemoveCohortResultMessage("");
    try {
      const result = await bulkRemoveByCohort(offeringId, Number(removeCohortYear));
      setRemoveCohortResultMessage(`ลบสำเร็จ ${result.removed_count} คน`);
      setRemoveCohortYear("");
      await onChanged();
    } catch (err) {
      setRemoveCohortError(err?.response?.data?.detail || "ลบนักศึกษารุ่นนี้ไม่สำเร็จ");
    } finally {
      setRemoveCohortSubmitting(false);
    }
  }

  async function handleAddStudent(e) {
    e.preventDefault();
    setAddError("");
    if (!addStudentId) return;
    try {
      await createEnrollment({ student_id: addStudentId, offering_id: offeringId });
      setAddStudentId("");
      setAddSearch("");
      await onChanged();
    } catch (err) {
      setAddError(err?.response?.data?.detail || "เพิ่มนักศึกษาไม่สำเร็จ");
    }
  }

  async function handleRemove(enrollment, student) {
    if (
      !window.confirm(
        `ยืนยันการลบ ${student.first_name} ${student.last_name} ออกจากการลงทะเบียนวิชานี้?`
      )
    )
      return;
    setRemoveError("");
    try {
      await deleteEnrollment(enrollment.id);
      await onChanged();
    } catch (err) {
      setRemoveError(err?.response?.data?.detail || "ลบไม่สำเร็จ");
    }
  }

  return (
    <>
    <div className="workspace-section">
      <h2>นักศึกษาลงทะเบียน</h2>
      {removeError && <p className="error-message">{removeError}</p>}

      <table className="student-table">
        <thead>
          <tr>
            <th>รหัสนักศึกษา</th>
            <th>ชื่อ-นามสกุล</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {enrolledRoster.map(({ enrollment, student }) => (
            <tr key={enrollment.id} className="student-table-row">
              <td className="student-table-cell">{student.id}</td>
              <td className="student-table-cell">
                {student.first_name} {student.last_name}
              </td>
              <td className="student-table-cell">
                <button
                  type="button"
                  className="icon-btn-delete"
                  title="ลบ"
                  onClick={() => handleRemove(enrollment, student)}
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {enrolledRoster.length === 0 && (
        <p className="student-list-empty">วิชานี้ยังไม่มีนักศึกษาลงทะเบียน</p>
      )}

      <form onSubmit={handleAddStudent} className="workspace-inline-form">
        <div className="form-field">
          <label htmlFor="enroll-search">ค้นหานักศึกษาที่ยังไม่ได้ลงทะเบียน</label>
          <div className="toolbar-search">
            <Search size={16} />
            <input
              id="enroll-search"
              type="text"
              placeholder="ค้นหารหัส/ชื่อนักศึกษา..."
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="enroll-select">เลือกนักศึกษา</label>
          <select
            id="enroll-select"
            value={addStudentId}
            onChange={(e) => setAddStudentId(e.target.value)}
            required
          >
            <option value="" disabled>
              เลือกนักศึกษา
            </option>
            {availableStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} {s.first_name} {s.last_name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">+ เพิ่มเข้าวิชานี้</button>
      </form>
      {addError && <p className="error-message">{addError}</p>}
      {availableStudents.length === 0 && addSearch === "" && (
        <p className="student-list-empty">นักศึกษาทุกคนลงทะเบียนวิชานี้แล้ว</p>
      )}
      </div>

      <div className="workspace-section">
        <h2>
          <Users size={18} strokeWidth={2} /> เพิ่มทั้งรุ่น/ชั้นปี
        </h2>
        {cohortError && <p className="error-message">{cohortError}</p>}
        <div className="workspace-inline-form">
          <div className="form-field">
            <label htmlFor="cohort-select">เลือกรุ่น (cohort_year)</label>
            <select
              id="cohort-select"
              value={cohortYear}
              onChange={(e) => {
                setCohortYear(e.target.value);
                setCohortResultMessage("");
              }}
            >
              <option value="">-- เลือกรุ่น --</option>
              {cohortOptions.map((y) => (
                <option key={y} value={y}>
                  รุ่น {y}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleBulkByCohort}
            disabled={!cohortYear || cohortSubmitting}
          >
            {cohortSubmitting ? "กำลังเพิ่ม..." : "เพิ่มนักศึกษารุ่นนี้ทั้งหมด"}
          </button>
        </div>
        {cohortYear && (
          <p className="workspace-hint-inline">
            จะเพิ่มนักศึกษา {cohortPreviewCount} คน (รุ่น {cohortYear} ที่ยังไม่ได้ลงทะเบียนวิชานี้)
          </p>
        )}
        {cohortYear && cohortOtherSectionStudents.length > 0 && (
          <div className="enroll-other-section-note">
            <p className="workspace-hint-inline">
              อีก {cohortOtherSectionStudents.length} คนของรุ่น {cohortYear} ลงทะเบียนวิชานี้ไปแล้วที่หมู่อื่น
              (จะไม่ถูกเพิ่มซ้ำ):
            </p>
            <ul className="enroll-other-section-list">
              {cohortOtherSectionStudents.map((s) => (
                <li key={s.id}>
                  {s.id} {s.first_name} {s.last_name} — หมู่ {otherSectionMap[s.id]}
                </li>
              ))}
            </ul>
          </div>
        )}
        {cohortResultMessage && <p className="success-message">{cohortResultMessage}</p>}
      </div>

      <div className="workspace-section">
        <h2>
          <Users size={18} strokeWidth={2} /> ลบรายชื่อทั้งรุ่น
        </h2>
        {removeCohortError && <p className="error-message">{removeCohortError}</p>}
        <div className="workspace-inline-form">
          <div className="form-field">
            <label htmlFor="remove-cohort-select">เลือกรุ่น (cohort_year)</label>
            <select
              id="remove-cohort-select"
              value={removeCohortYear}
              onChange={(e) => {
                setRemoveCohortYear(e.target.value);
                setRemoveCohortResultMessage("");
              }}
            >
              <option value="">-- เลือกรุ่น --</option>
              {enrolledCohortOptions.map((y) => (
                <option key={y} value={y}>
                  รุ่น {y}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleBulkRemoveByCohort}
            disabled={!removeCohortYear || removeCohortSubmitting}
          >
            {removeCohortSubmitting ? "กำลังลบ..." : "ลบนักศึกษารุ่นนี้ทั้งหมด"}
          </button>
        </div>
        {removeCohortYear && (
          <p className="workspace-hint-inline">
            จะลบนักศึกษา {removeCohortCandidates.length} คน (รุ่น {removeCohortYear} ที่ลงทะเบียนวิชานี้อยู่)
            ออกจากการลงทะเบียนวิชานี้
          </p>
        )}
        {removeCohortResultMessage && <p className="success-message">{removeCohortResultMessage}</p>}
      </div>

      <BulkEnrollPanel
        offeringId={offeringId}
        allStudents={allStudents}
        onChanged={onChanged}
        showMultiSelect={false}
      />
    </>
  );
}
