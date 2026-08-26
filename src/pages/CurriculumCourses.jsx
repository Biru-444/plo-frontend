import { useEffect, useMemo, useState } from "react";
import { listCourses, listCurricula } from "../api/client.js";

export default function CurriculumCourses() {
  const [curricula, setCurricula] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([listCurricula(), listCourses()])
      .then(([curriculaData, coursesData]) => {
        if (cancelled) return;
        setCurricula(curriculaData);
        setCourses(coursesData);
        if (curriculaData.length > 0) {
          setSelectedCurriculumId(curriculaData[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("ดึงข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const coursesForSelectedCurriculum = useMemo(
    () => courses.filter((course) => course.curriculum_id === selectedCurriculumId),
    [courses, selectedCurriculumId]
  );

  const filteredCourses = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return coursesForSelectedCurriculum;
    return coursesForSelectedCurriculum.filter((course) => {
      const nameEn = (course.name_en ?? "").toLowerCase();
      return (
        course.course_code.toLowerCase().includes(trimmed) ||
        course.name_th.toLowerCase().includes(trimmed) ||
        nameEn.includes(trimmed)
      );
    });
  }, [coursesForSelectedCurriculum, query]);

  return (
    <div className="page">
      <h1>หลักสูตร/รายวิชา</h1>

      {error && <p className="error-message">{error}</p>}

      {loading && <p className="loading-message">กำลังโหลดข้อมูล...</p>}

      {!loading && !error && (
        <div className="curriculum-layout">
          <aside className="curriculum-sidebar">
            {curricula.map((curriculum) => (
              <button
                key={curriculum.id}
                type="button"
                className={`curriculum-item ${
                  curriculum.id === selectedCurriculumId ? "selected" : ""
                }`}
                onClick={() => setSelectedCurriculumId(curriculum.id)}
              >
                <span className="curriculum-item-name">{curriculum.name}</span>
                <span className="curriculum-item-year">ปีการศึกษา {curriculum.year}</span>
                <span
                  className={`curriculum-badge ${
                    curriculum.is_active ? "active" : "inactive"
                  }`}
                >
                  {curriculum.is_active ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                </span>
              </button>
            ))}
          </aside>

          <div className="curriculum-courses">
            <div className="student-list-toolbar">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาด้วยรหัสวิชาหรือชื่อวิชา"
                aria-label="ค้นหารายวิชา"
              />
            </div>

            <table className="student-table">
              <thead>
                <tr>
                  <th>รหัสวิชา</th>
                  <th>ชื่อวิชา (ไทย)</th>
                  <th>ชื่อวิชา (อังกฤษ)</th>
                  <th>หน่วยกิต</th>
                  <th>หมวดหมู่</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="student-table-row">
                    <td className="student-table-cell">{course.course_code}</td>
                    <td className="student-table-cell">{course.name_th}</td>
                    <td className="student-table-cell">{course.name_en ?? "-"}</td>
                    <td className="student-table-cell">{course.credit}</td>
                    <td className="student-table-cell">{course.category ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCourses.length === 0 && (
              <p className="student-list-empty">ไม่พบรายวิชาที่ตรงกับคำค้นหา</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
