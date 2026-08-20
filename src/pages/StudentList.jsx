import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listStudents } from "../api/client.js";

const STATUS_BADGE_CLASS = {
  กำลังศึกษา: "status-active",
  ลาออก: "status-dropped",
  พักการเรียน: "status-suspended",
  จบการศึกษา: "status-graduated",
};

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    listStudents()
      .then((data) => {
        if (!cancelled) {
          setStudents(data);
          const cohorts = [...new Set(data.map((s) => s.cohort_year))].sort((a, b) => a - b);
          if (cohorts.length > 0) setSelectedCohort(cohorts[cohorts.length - 1]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาตรวจสอบว่า backend กำลังทำงานอยู่");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const cohortOptions = useMemo(
    () => [...new Set(students.map((s) => s.cohort_year))].sort((a, b) => a - b),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return students.filter((student) => {
      if (selectedCohort !== null && student.cohort_year !== selectedCohort) return false;
      if (!trimmed) return true;
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
      return student.id.toLowerCase().includes(trimmed) || fullName.includes(trimmed);
    });
  }, [students, query, selectedCohort]);

  return (
    <div className="page">
      <h1>รายชื่อนักศึกษา</h1>

      {cohortOptions.length > 0 && (
        <div className="cohort-tabs">
          {cohortOptions.map((cohort) => (
            <button
              key={cohort}
              type="button"
              className={`cohort-tab ${cohort === selectedCohort ? "selected" : ""}`}
              onClick={() => setSelectedCohort(cohort)}
            >
              รุ่น {cohort}
            </button>
          ))}
        </div>
      )}

      <div className="student-list-toolbar">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาด้วยรหัสหรือชื่อ-นามสกุล"
          aria-label="ค้นหานักศึกษา"
        />
      </div>

      {error && <p className="error-message">{error}</p>}

      {loading && <p className="loading-message">กำลังโหลดข้อมูล...</p>}

      {!loading && !error && (
        <>
          <table className="student-table">
            <thead>
              <tr>
                <th>รหัสนักศึกษา</th>
                <th>คำนำหน้า+ชื่อ-นามสกุล</th>
                <th>หลักสูตร</th>
                <th>ปีที่เรียน</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <Link
                  key={student.id}
                  to={`/?student_id=${encodeURIComponent(student.id)}`}
                  className="student-table-row"
                >
                  <span className="student-table-cell">{student.id}</span>
                  <span className="student-table-cell">
                    {student.title ? `${student.title} ` : ""}
                    {student.first_name} {student.last_name}
                  </span>
                  <span className="student-table-cell">{student.curriculum_id}</span>
                  <span className="student-table-cell">{`ปี ${student.current_year_level}`}</span>
                  <span className="student-table-cell">
                    <span className={`status-badge ${STATUS_BADGE_CLASS[student.status] ?? ""}`}>
                      {student.status}
                    </span>
                  </span>
                </Link>
              ))}
            </tbody>
          </table>

          {filteredStudents.length === 0 && (
            <p className="student-list-empty">ไม่พบนักศึกษาที่ตรงกับคำค้นหา</p>
          )}
        </>
      )}
    </div>
  );
}
