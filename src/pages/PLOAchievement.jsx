/**
 * ทำอะไร : หน้า "ผลบรรลุ PLO รายบุคคล" (route /student-plo) — ค้นหานักศึกษาด้วยรหัส แล้วแสดงผลบรรลุ
 *          PLO แบบ split-screen (ซ้าย = สรุป+chip grid PLO, ขวา = รายวิชา->YLO ตามชั้นปี) กดที่ PLO
 *          chip เพื่อกรองรายวิชาฝั่งขวาให้เหลือเฉพาะวิชาที่เกี่ยวกับ PLO นั้นได้
 *
 * เชื่อมกับ : เรียก 4 endpoint พร้อมกัน (บาง endpoint ไม่ block การแสดงผลหลัก ดูคอมเมนต์ในโค้ด) —
 *             ถ้ามาจาก URL query param ?student_id=... (เช่น คลิกชื่อนักศึกษาจากหน้ารายชื่อ) จะค้นหา
 *             ให้อัตโนมัติทันทีที่เปิดหน้า
 *
 * ถ้าแก้ : courseToPlos คำนวณฝั่ง frontend จาก listCLO()+listCLOPLOMapping() (ไม่มี backend endpoint
 *          ใหม่) เพื่อให้ PLO chip กรองรายวิชาได้ - วิชาหนึ่งเกี่ยวกับ PLO ข้อหนึ่งถ้ามี CLO ข้อใดของวิชา
 *          นั้นผูกกับ PLO นั้นผ่าน clo_plo_mapping (เปลี่ยนจาก course_plo/responsibility_level='primary'
 *          เดิมมาเป็นระดับ CLO แล้ว - ดู แผนการแก้ไขครั้งใหญ่-PLO-CLO.md Workstream 1 ข้อ 4 - ถ้า backend
 *          เปลี่ยนที่มาของ "อะไรนับเป็นหลักฐานของ PLO" ต้องแก้ตรงนี้ให้ตรงกับ _build_plo_requirements ใน
 *          plo_calculation.py ด้วย
 */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getCurriculum,
  getStudent,
  getStudentPLOAchievement,
  getStudentYLOAchievement,
  listCLO,
  listCLOPLOMapping,
} from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import StudentProfileCard from "../components/StudentProfileCard.jsx";
import PLOSummaryStats from "../components/PLOSummaryStats.jsx";
import PLOChipGrid from "../components/PLOChipGrid.jsx";
import StudentYearBreakdown from "../components/StudentYearBreakdown.jsx";

export default function PLOAchievement() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  // รหัสนักศึกษาในช่องค้นหา (ควบคุมด้วย input ด้านล่าง)
  const [studentId, setStudentId] = useState("");
  // ผลบรรลุ PLO ดิบจาก backend - null = ยังไม่เคยค้นหาสำเร็จ (ซ่อนผลลัพธ์ทั้งบล็อก)
  const [result, setResult] = useState(null);
  const [student, setStudent] = useState(null);
  const [curriculumName, setCurriculumName] = useState(null);
  const [yloYears, setYloYears] = useState(null);
  // course_id -> Set(plo_code) สำหรับกรองรายวิชาฝั่งขวาตาม PLO chip ที่เลือก (ดูคอมเมนต์ด้านล่าง)
  const [courseToPlos, setCourseToPlos] = useState({});
  // PLO chip ที่กำลังเลือกกรองอยู่ - null = ไม่กรอง (แสดงทุกวิชา)
  const [selectedPloFilter, setSelectedPloFilter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ค้นหานักศึกษาแล้วโหลดข้อมูลทุกส่วนของหน้า (ผลบรรลุ PLO, ข้อมูลนักศึกษา, ชื่อหลักสูตร, ผลบรรลุ YLO
  // รายปี, mapping วิชา->PLO) - ผลบรรลุ PLO + ข้อมูลนักศึกษาต้องรอให้เสร็จก่อน (Promise.all) เพราะเป็น
  // ข้อมูลหลักของหน้า ส่วนที่เหลือยิงต่อแบบไม่ block เพราะเป็นข้อมูลเสริม พังได้โดยหน้ายังใช้งานต่อได้
  async function fetchPLOAchievement(rawId) {
    const trimmed = rawId.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setStudent(null);
    setCurriculumName(null);
    setYloYears(null);
    setCourseToPlos({});
    setSelectedPloFilter(null);

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

      // สร้าง course_id -> Set(plo_code) จาก clo_plo_mapping (ระดับ CLO) เพื่อให้กด PLO chip แล้วกรอง
      // รายวิชาฝั่งขวาได้ - วิชาหนึ่งเกี่ยวกับ PLO ข้อหนึ่งถ้ามี CLO ข้อใดของวิชานั้นผูกกับ PLO นั้น ทำ
      // client-side จาก endpoint ที่มีอยู่แล้ว (listCLO + listCLOPLOMapping) ไม่ต้องเพิ่ม backend ใหม่
      // ผูก plo_id -> plo_code จาก achievement.plo_achievements ที่ได้มาแล้วด้านบน
      const ploCodeByPloId = Object.fromEntries(
        achievement.plo_achievements.map((p) => [p.plo_id, p.plo_code])
      );
      Promise.all([listCLO(), listCLOPLOMapping()])
        .then(([clos, mappings]) => {
          const courseIdByCloId = Object.fromEntries(clos.map((c) => [c.id, c.course_id]));
          const map = {};
          mappings.forEach((m) => {
            const code = ploCodeByPloId[m.plo_id];
            const courseId = courseIdByCloId[m.clo_id];
            if (!code || !courseId) return;
            if (!map[courseId]) map[courseId] = new Set();
            map[courseId].add(code);
          });
          setCourseToPlos(map);
        })
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

  // ถ้ามี student_id ใน URL query param (เช่น คลิกชื่อนักศึกษาจากหน้ารายชื่อ) ให้ค้นหาอัตโนมัติทันที
  // ที่เปิดหน้า - fetchPLOAchievement จงใจไม่ใส่ใน dependency array เพราะเป็นฟังก์ชันที่สร้างใหม่ทุก
  // render (ใส่ไปจะ re-run เกินจำเป็น อยากให้ effect นี้รันแค่ตอน searchParams เปลี่ยนจริงๆ)
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
          <div className="student-plo-topbar">
            <StudentProfileCard student={student} curriculumName={curriculumName} />
            <div className="student-plo-topbar-actions">
              <button type="button" className="export-pdf-button" onClick={() => window.print()}>
                Export PDF
              </button>
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
          </div>

          <div className="student-plo-split">
            <div className="student-plo-left">
              <PLOSummaryStats achievements={result.plo_achievements} />
              <PLOChipGrid
                achievements={result.plo_achievements}
                selected={selectedPloFilter}
                onSelect={setSelectedPloFilter}
              />
            </div>
            <div className="student-plo-right">
              <StudentYearBreakdown
                studentId={student?.id}
                years={yloYears}
                courseToPlos={courseToPlos}
                selectedPloFilter={selectedPloFilter}
                onClearFilter={() => setSelectedPloFilter(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
