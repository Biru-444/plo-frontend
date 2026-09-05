import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import SearchableSelect from "../../components/SearchableSelect.jsx";
import BulkEnrollPanel from "../../components/BulkEnrollPanel.jsx";
import {
  listStudents,
  listCourses,
  listCourseOfferings,
  listStudentEnrollments,
  getRecommendedOfferings,
  createEnrollment,
  deleteEnrollment,
} from "../../api/client.js";

const STATUS_BADGE_CLASS = {
  กำลังศึกษา: "status-active",
  ลาออก: "status-dropped",
  พักการเรียน: "status-suspended",
  จบการศึกษา: "status-graduated",
};

function offeringLabel(offering, courseById) {
  const course = courseById[offering.course_id];
  const courseLabel = course ? `${course.course_code} ${course.name_th}` : `วิชา #${offering.course_id}`;
  return `${courseLabel} | ปีการศึกษา ${offering.academic_year} เทอม ${offering.semester} หมู่ ${offering.section}`;
}

/**
 * หน้าลงทะเบียนนักศึกษาด้วยตนเอง (manual 100% - ไม่มี auto-enroll) แทนที่หน้า CrudManager
 * เดิมที่นี่ (select ธรรมดา, list รวมทุก enrollment ในระบบไม่แยกนักศึกษา) เพราะ auto-enroll ไม่รู้ว่า
 * นักศึกษาคนไหนลาออกกลางคันแล้วไม่ควรลงทะเบียนวิชาต่อๆ ไปให้ - ต้องเลือกนักศึกษาก่อนเสมอ แล้วจัดการ
 * เฉพาะรายวิชาของคนนั้นทีละคน (master-detail ไม่ใช่ตารางรวมแบบเดิม)
 */
export default function AdminEnrollments() {
  // "single" = ลงทะเบียนทีละคน (ค่าเริ่มต้น, UI เดิมทั้งหมด) | "bulk" = ลงทะเบียนแบบกลุ่ม (ใหม่)
  const [mode, setMode] = useState("single");

  const [studentOptions, setStudentOptions] = useState([]);
  const [studentById, setStudentById] = useState({});
  const [offeringOptions, setOfferingOptions] = useState([]);
  const [offeringById, setOfferingById] = useState({});

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [enrollments, setEnrollments] = useState({ status: "idle", rows: [] });
  const [recommendations, setRecommendations] = useState({ status: "idle", rows: [] });

  const [selectedOfferingId, setSelectedOfferingId] = useState("");
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");

  // สำหรับโหมด "ลงทะเบียนแบบกลุ่ม" เท่านั้น - แยก state จาก selectedOfferingId ของโหมดทีละคน
  const [bulkOfferingId, setBulkOfferingId] = useState("");

  // รายชื่อนักศึกษาทั้งหมดแบบดิบ (ใช้ studentById ที่โหลดไว้อยู่แล้วสำหรับโหมดทีละคน) ให้
  // BulkEnrollPanel ใช้เป็นตัวเลือกในโหมดลงทะเบียนแบบกลุ่ม ไม่ต้องโหลดซ้ำ
  const allStudents = useMemo(() => Object.values(studentById), [studentById]);

  useEffect(() => {
    listStudents().then((data) => {
      setStudentOptions(data.map((s) => ({ value: s.id, label: `${s.id} ${s.first_name} ${s.last_name}` })));
      setStudentById(Object.fromEntries(data.map((s) => [s.id, s])));
    });
    Promise.all([listCourseOfferings(), listCourses()]).then(([offerings, courses]) => {
      const courseById = Object.fromEntries(courses.map((c) => [c.id, c]));
      setOfferingOptions(
        offerings.map((o) => ({ value: o.id, label: offeringLabel(o, courseById) }))
      );
      setOfferingById(
        Object.fromEntries(offerings.map((o) => [o.id, { ...o, label: offeringLabel(o, courseById) }]))
      );
    });
  }, []);

  const selectedStudent = selectedStudentId ? studentById[selectedStudentId] : null;

  function loadStudentData(studentId) {
    setEnrollments({ status: "loading", rows: [] });
    setRecommendations({ status: "loading", rows: [] });
    listStudentEnrollments(studentId)
      .then((rows) => setEnrollments({ status: "ready", rows }))
      .catch(() => setEnrollments({ status: "error", rows: [] }));
    getRecommendedOfferings(studentId)
      .then((rows) => setRecommendations({ status: "ready", rows }))
      .catch(() => setRecommendations({ status: "error", rows: [] }));
  }

  function handleSelectStudent(studentId) {
    setSelectedStudentId(studentId);
    setSelectedOfferingId("");
    setError("");
    if (studentId) loadStudentData(studentId);
  }

  function handleSuggestionClick(offeringId) {
    setSelectedOfferingId(offeringId);
    setError("");
  }

  async function handleRegister() {
    if (!selectedStudentId || !selectedOfferingId) return;
    if (
      selectedStudent &&
      selectedStudent.status !== "กำลังศึกษา" &&
      !window.confirm(
        `นักศึกษาคนนี้มีสถานะ: ${selectedStudent.status} - ยืนยันว่าต้องการลงทะเบียนจริงหรือไม่?`
      )
    ) {
      return;
    }
    setRegistering(true);
    setError("");
    try {
      await createEnrollment({ student_id: selectedStudentId, offering_id: Number(selectedOfferingId) });
      setSelectedOfferingId("");
      loadStudentData(selectedStudentId);
    } catch (err) {
      setError(err?.response?.data?.detail || "ลงทะเบียนไม่สำเร็จ");
    } finally {
      setRegistering(false);
    }
  }

  async function handleUnenroll(enrollment) {
    if (!window.confirm("ยืนยันการยกเลิกลงทะเบียนวิชานี้? การกระทำนี้ย้อนกลับไม่ได้")) return;
    setError("");
    try {
      await deleteEnrollment(enrollment.id);
      loadStudentData(selectedStudentId);
    } catch (err) {
      setError(err?.response?.data?.detail || "ยกเลิกลงทะเบียนไม่สำเร็จ");
    }
  }

  const enrolledOfferingIds = useMemo(
    () => new Set(enrollments.rows.map((e) => e.offering_id)),
    [enrollments.rows]
  );
  const availableOfferingOptions = useMemo(
    () => offeringOptions.filter((o) => !enrolledOfferingIds.has(o.value)),
    [offeringOptions, enrolledOfferingIds]
  );

  return (
    <div className="crud-manager">
      <Link to="/admin" className="crud-back-link">
        <ArrowLeft size={14} strokeWidth={2} />
        กลับหน้าจัดการระบบ
      </Link>
      <div className="crud-header">
        <h2>ลงทะเบียนนักศึกษา</h2>
      </div>

      <div className="workspace-tabs">
        <button
          type="button"
          className={`workspace-tab-btn ${mode === "single" ? "active" : ""}`}
          onClick={() => setMode("single")}
        >
          ลงทะเบียนทีละคน
        </button>
        <button
          type="button"
          className={`workspace-tab-btn ${mode === "bulk" ? "active" : ""}`}
          onClick={() => setMode("bulk")}
        >
          ลงทะเบียนแบบกลุ่ม
        </button>
      </div>

      {mode === "single" && (
        <>
          <div className="workspace-section">
            <h2>เลือกนักศึกษา</h2>
            <SearchableSelect
              value={selectedStudentId}
              onChange={handleSelectStudent}
              options={studentOptions}
              placeholder="พิมพ์รหัสหรือชื่อนักศึกษา..."
            />
          </div>

          {selectedStudent && (
            <>
              <div className="workspace-section">
                <h2>สถานะนักศึกษา</h2>
                <p>
                  {selectedStudent.id} {selectedStudent.first_name} {selectedStudent.last_name} ·{" "}
                  <span className={`status-badge ${STATUS_BADGE_CLASS[selectedStudent.status] ?? ""}`}>
                    {selectedStudent.status}
                  </span>
                </p>
                {selectedStudent.status !== "กำลังศึกษา" && (
                  <p className="error-text">
                    นักศึกษาคนนี้มีสถานะ: {selectedStudent.status} - โปรดตรวจสอบก่อนลงทะเบียนวิชาเพิ่ม
                    (ระบบจะถามยืนยันอีกครั้งตอนกดลงทะเบียน)
                  </p>
                )}
              </div>

              <div className="workspace-section">
                <h2>รายวิชาที่ลงทะเบียนอยู่แล้ว</h2>
                {enrollments.status === "loading" && <p className="loading-message">กำลังโหลดข้อมูล...</p>}
                {enrollments.status === "error" && (
                  <p className="error-message">โหลดรายวิชาที่ลงทะเบียนไม่สำเร็จ ลองใหม่อีกครั้ง</p>
                )}
                {enrollments.status === "ready" &&
                  (enrollments.rows.length === 0 ? (
                    <p className="student-list-empty">นักศึกษาคนนี้ยังไม่ได้ลงทะเบียนวิชาใดเลย</p>
                  ) : (
                    <table className="crud-table">
                      <thead>
                        <tr>
                          <th>วิชา</th>
                          <th>เกรด</th>
                          <th>การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.rows.map((e) => (
                          <tr key={e.id}>
                            <td>{offeringById[e.offering_id]?.label ?? `offering #${e.offering_id}`}</td>
                            <td>{e.final_grade ?? "-"}</td>
                            <td>
                              <button
                                className="icon-btn-delete"
                                title="ยกเลิกลงทะเบียน"
                                onClick={() => handleUnenroll(e)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ))}
              </div>

              {recommendations.status === "ready" && recommendations.rows.length > 0 && (
                <div className="workspace-section">
                  <h2>คำแนะนำตามแผนการเรียน</h2>
                  <p className="workspace-hint">
                    วิชาที่แผนการศึกษากำหนดไว้สำหรับชั้นปีที่เรียนมาแล้วจนถึงปัจจุบัน และยังไม่ได้ลงทะเบียน -
                    กดเพื่อเลือก ยังต้องกด "ลงทะเบียน" ด้านล่างเพื่อยืนยันอีกครั้ง (ไม่ได้ลงทะเบียนอัตโนมัติ)
                  </p>
                  <div className="plo-course-chip-row">
                    {recommendations.rows.map((r) => (
                      <button
                        key={r.offering_id}
                        type="button"
                        className={`plo-course-chip ${
                          String(selectedOfferingId) === String(r.offering_id) ? "expanded" : ""
                        }`}
                        onClick={() => handleSuggestionClick(r.offering_id)}
                      >
                        <span>
                          {r.course_code} {r.name_th}
                        </span>
                        <span className="plo-course-chip-badge">
                          ปี {r.year_level} · หมู่ {r.section}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="workspace-section">
                <h2>ลงทะเบียนวิชาใหม่</h2>
                {error && <p className="error-text">{error}</p>}
                <div className="workspace-inline-form">
                  <div className="form-field">
                    <label htmlFor="enroll-offering-select">วิชาที่เปิดสอน</label>
                    <SearchableSelect
                      id="enroll-offering-select"
                      value={selectedOfferingId}
                      onChange={setSelectedOfferingId}
                      options={availableOfferingOptions}
                      placeholder="พิมพ์รหัสหรือชื่อวิชา..."
                    />
                  </div>
                  <button type="button" onClick={handleRegister} disabled={!selectedOfferingId || registering}>
                    {registering ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {mode === "bulk" && (
        <>
          <div className="workspace-section">
            <h2>เลือกวิชาที่เปิดสอน</h2>
            <SearchableSelect
              id="bulk-offering-select"
              value={bulkOfferingId}
              onChange={setBulkOfferingId}
              options={offeringOptions}
              placeholder="พิมพ์รหัสหรือชื่อวิชา..."
            />
          </div>

          {bulkOfferingId && (
            <BulkEnrollPanel
              offeringId={Number(bulkOfferingId)}
              allStudents={allStudents}
              onChanged={() => {}}
            />
          )}
        </>
      )}
    </div>
  );
}
