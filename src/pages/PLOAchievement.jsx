import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getCurriculum,
  getStudent,
  getStudentPLOAchievement,
  getStudentYLOAchievement,
} from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import PLOBar from "../components/PLOBar.jsx";
import StudentProfileCard from "../components/StudentProfileCard.jsx";
import PLOSummaryStats from "../components/PLOSummaryStats.jsx";
import PLORadarChart from "../components/PLORadarChart.jsx";
import StudentYearBreakdown from "../components/StudentYearBreakdown.jsx";

export default function PLOAchievement() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [result, setResult] = useState(null);
  const [student, setStudent] = useState(null);
  const [curriculumName, setCurriculumName] = useState(null);
  const [yloYears, setYloYears] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchPLOAchievement(rawId) {
    const trimmed = rawId.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setStudent(null);
    setCurriculumName(null);
    setYloYears(null);

    try {
      const [achievement, studentData] = await Promise.all([
        getStudentPLOAchievement(trimmed),
        getStudent(trimmed),
      ]);
      setResult(achievement);
      setStudent(studentData);

      // ไม่ block การแสดงผล - ถ้าดึงชื่อหลักสูตรไม่ได้ StudentProfileCard จะ fallback เป็น #curriculum_id เอง
      getCurriculum(studentData.curriculum_id)
        .then((curriculum) => setCurriculumName(`${curriculum.name} (${curriculum.year})`))
        .catch(() => {});

      // เช่นเดียวกัน ไม่ block การแสดงผลหลัก - ถ้าดึงไม่ได้ ส่วนรายวิชา/YLO แค่ไม่แสดง (StudentYearBreakdown
      // คืน null ถ้า years ว่าง/ไม่มี)
      getStudentYLOAchievement(trimmed)
        .then((data) => setYloYears(data.years))
        .catch(() => {});
    } catch (err) {
      if (err.response?.status === 404) {
        setError(`ไม่พบนักศึกษารหัส "${trimmed}"`);
      } else {
        setError("ดึงข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const paramStudentId = searchParams.get("student_id");
    if (paramStudentId) {
      setStudentId(paramStudentId);
      fetchPLOAchievement(paramStudentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    fetchPLOAchievement(studentId);
  }

  const achievedCount = result?.plo_achievements.filter((p) => p.is_achieved).length ?? 0;
  const totalCount = result?.plo_achievements.length ?? 0;

  return (
    <div className="page">
      <h1>ผลการบรรลุ PLO รายบุคคล</h1>

      <form onSubmit={handleSubmit} className="search-form">
        <label htmlFor="student-id">รหัสนักศึกษา</label>
        <input
          id="student-id"
          type="text"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="เช่น 6500001"
        />
        <button type="submit" disabled={loading}>
          {loading ? "กำลังค้นหา..." : "ค้นหา"}
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}

      {result && (
        <div className="result">
          <button type="button" className="export-pdf-button" onClick={() => window.print()}>
            Export PDF
          </button>

          <StudentProfileCard student={student} curriculumName={curriculumName} />

          <PLOSummaryStats achievements={result.plo_achievements} />

          <PLORadarChart achievements={result.plo_achievements} />

          <StudentYearBreakdown years={yloYears} />

          <div className="student-summary">
            <h2 className="student-year-breakdown-title">PLO แต่ละข้อ</h2>
            <p className="achievement-count">
              บรรลุ {achievedCount} จาก {totalCount} ข้อ
            </p>
          </div>

          <div className="plo-list">
            {result.plo_achievements.map((plo) => (
              <PLOBar
                key={plo.plo_id}
                code={plo.plo_code}
                description={plo.description}
                achievedPercent={plo.achieved_percent}
                isAchieved={plo.is_achieved}
              />
            ))}
          </div>

          {(user?.role === "admin" || user?.role === "instructor") && (
            <div className="plo-admin-actions">
              <Link to={`/scores?student_id=${studentId}`} className="button-secondary">
                แก้ไขคะแนนนักศึกษาคนนี้
              </Link>
              {user?.role === "admin" && (
                <Link to="/admin/students" className="button-secondary">
                  แก้ไขข้อมูลนักศึกษา
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
