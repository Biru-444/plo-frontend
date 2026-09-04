import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getCohortPLOAchievement } from "../api/client.js";
import PLOCohortBar from "../components/PLOCohortBar.jsx";
import PLOCourseBreakdown from "../components/PLOCourseBreakdown.jsx";
import PLOStudentBreakdown from "../components/PLOStudentBreakdown.jsx";

const COHORT_ACHIEVED_THRESHOLD = 50;

// ทั้ง 2 route (/plo/overview/:ploId, /plo/cohort/:ploId) ใช้ component เดียวกันนี้ - ข้อมูล/endpoint
// เหมือนกันทุกจุด (getCohortPLOAchievement ตัวเดียวกัน) ต่างกันแค่ป้าย/ปลายทางปุ่มกลับ เพราะหน้า
// "ภาพรวม PLO" กับ "PLO เมื่อจบการศึกษา" ใช้ตัวเลขชุดเดียวกันอยู่แล้วตั้งแต่ก่อนงานนี้ (ดูคอมเมนต์เดิม
// ใน PLOYearProgress.jsx) ไม่ใช่ endpoint คนละตัวที่บังเอิญคืนค่าเหมือนกัน
const CONTEXT_META = {
  overview: { backLabel: "ภาพรวม PLO" },
  cohort: { backLabel: "PLO เมื่อจบการศึกษา" },
};

export default function PLODetailPage({ context }) {
  const { ploId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const curriculumId = searchParams.get("curriculum");
  const cohortYear = searchParams.get("cohort");

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // ตาราง "บรรลุ PLO" ซ่อนไว้ก่อนเป็นค่าเริ่มต้น ผู้ใช้ต้องกดปุ่มเปิดเองชัดเจน (แทนของเดิมที่ผูกกับ
  // "กดชิปวิชาแล้ว" ซึ่งเป็นสัญญาณอ้อมและไม่มีปุ่มปิดกลับ) - ไม่ fetch เพิ่ม ข้อมูลมาจาก summary.students
  // ที่ fetch ไว้แล้วสำหรับ header อยู่แล้ว
  const [showStudentList, setShowStudentList] = useState(false);
  // ตัวกรอง "รุ่น" (เลข 2 หลักแรกของรหัสนักศึกษา) เฉพาะของตารางนี้ - คนละตัวกับ dropdown รุ่นใน
  // PLOCourseBreakdown ไม่แชร์ state กัน ยกขึ้นมาไว้ที่นี่ (แทนที่จะเก็บใน PLOStudentBreakdown เอง)
  // เพราะ header (PLOCohortBar) ต้องคำนวณตัวเลขสรุปใหม่ตามรุ่นที่เลือกด้วยเช่นกัน ไม่ใช่แค่กรองแถวตาราง
  const [studentListCohortPrefix, setStudentListCohortPrefix] = useState("");

  useEffect(() => {
    if (!curriculumId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCohortPLOAchievement(Number(curriculumId), cohortYear ? Number(cohortYear) : null)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setError("ดึงข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [curriculumId, cohortYear]);

  const backBasePath =
    context === "overview" ? (user?.role === "instructor" ? "/dashboard" : "/") : "/plo-by-year";
  const backQuery = curriculumId
    ? `?curriculum=${curriculumId}${cohortYear ? `&cohort=${cohortYear}` : ""}`
    : "";

  const plo = summary?.plo_summary.find((p) => String(p.plo_id) === String(ploId));

  // ตัวเลือก "รุ่น" สร้างจากรหัสนักศึกษาที่มีอยู่จริงใน summary.students เท่านั้น (dynamic ตามข้อมูล
  // ปัจจุบัน ไม่ hardcode) เรียงน้อยไปมาก
  const availableStudentListCohortPrefixes = useMemo(() => {
    if (!summary) return [];
    const prefixes = new Set();
    summary.students.forEach((s) => prefixes.add(s.student_id.slice(0, 2)));
    return Array.from(prefixes).sort((a, b) => Number(a) - Number(b));
  }, [summary]);

  const filteredStudentListStudents = useMemo(() => {
    if (!summary) return [];
    if (!studentListCohortPrefix) return summary.students;
    return summary.students.filter((s) => s.student_id.slice(0, 2) === studentListCohortPrefix);
  }, [summary, studentListCohortPrefix]);

  // ตัวเลขสรุปบน header (PLOCohortBar) - เลือก "ทั้งหมด" (studentListCohortPrefix ว่าง) ใช้ตัวเลขที่
  // backend คำนวณมาให้ตรงเป๊ะ (plo.average_achieved_percent ฯลฯ จาก summary.plo_summary) ไม่คำนวณเอง
  // ซ้ำ เพื่อความชัวร์ว่าตรงกับค่าที่เคยแสดงมาตลอด - คำนวณเองเฉพาะตอนกรองรุ่นแล้วเท่านั้น (ไม่มี endpoint
  // กรองตามรุ่นแบบนี้ให้ตรงๆ) โดยใช้ field เดียวกับที่ PLOStudentBreakdown ใช้อยู่แล้วเป๊ะ (แต่ละคนมี
  // plo_achievements[].achieved_percent/is_achieved ต่อ PLO อยู่แล้วในข้อมูลชุดเดียวกับ header) สูตร
  // เดียวกับที่ backend ใช้ (_aggregate_plo_percent_stats ใน plo_calculation.py): เฉลี่ย = ผลรวม
  // achieved_percent หารด้วยจำนวนคน, อัตราบรรลุ = จำนวนคนบรรลุ/จำนวนคนทั้งหมด*100
  const headerStats = useMemo(() => {
    if (!plo || !summary) return null;
    if (!studentListCohortPrefix) {
      return {
        averagePercent: plo.average_achieved_percent,
        achievedStudentCount: plo.achieved_student_count,
        totalStudents: summary.total_students,
        achievedRatePercent: plo.achieved_rate_percent,
      };
    }
    const achievements = filteredStudentListStudents
      .map((s) => s.plo_achievements.find((item) => item.plo_id === plo.plo_id))
      .filter(Boolean);
    const totalStudents = achievements.length;
    if (totalStudents === 0) {
      return { averagePercent: 0, achievedStudentCount: 0, totalStudents: 0, achievedRatePercent: 0 };
    }
    const achievedStudentCount = achievements.filter((a) => a.is_achieved).length;
    const percentSum = achievements.reduce((sum, a) => sum + a.achieved_percent, 0);
    return {
      averagePercent: Number((percentSum / totalStudents).toFixed(1)),
      achievedStudentCount,
      totalStudents,
      achievedRatePercent: Number(((achievedStudentCount / totalStudents) * 100).toFixed(1)),
    };
  }, [plo, summary, studentListCohortPrefix, filteredStudentListStudents]);

  function handleToggleStudentList() {
    setShowStudentList((prev) => {
      const next = !prev;
      // ปิดตาราง -> reset ตัวกรองรุ่นกลับ "ทั้งหมด" ด้วย เพื่อให้ header กลับไปโชว์ภาพรวมทั้งหมดเหมือนก่อน
      // เปิดตาราง ไม่ค้างค่ารุ่นที่เคยเลือกไว้จากรอบก่อน
      if (!next) setStudentListCohortPrefix("");
      return next;
    });
  }

  return (
    <div className="page">
      <Link to={`${backBasePath}${backQuery}`} className="crud-back-link">
        <ArrowLeft size={14} strokeWidth={2} />
        กลับไป{CONTEXT_META[context].backLabel}
      </Link>

      {!curriculumId && (
        <p className="error-message">ไม่พบพารามิเตอร์หลักสูตรใน URL - กรุณากลับไปเลือกหลักสูตรใหม่</p>
      )}
      {error && <p className="error-message">{error}</p>}
      {loading && <p className="loading-message">กำลังโหลดข้อมูล...</p>}

      {!loading && !error && summary && !plo && (
        <p className="error-message">ไม่พบ PLO ข้อนี้ในหลักสูตรที่เลือก</p>
      )}

      {!loading && !error && plo && (
        <>
          <PLOCohortBar
            code={plo.plo_code}
            description={plo.description}
            averagePercent={headerStats.averagePercent}
            isAchieved={headerStats.achievedRatePercent >= COHORT_ACHIEVED_THRESHOLD}
            achievedStudentCount={headerStats.achievedStudentCount}
            totalStudents={headerStats.totalStudents}
            achievedRatePercent={headerStats.achievedRatePercent}
            isExpandable={false}
          />
          <div className="plo-expanded-detail">
            <PLOCourseBreakdown
              ploId={plo.plo_id}
              cohortYear={cohortYear ? Number(cohortYear) : null}
            />

            <div className="plo-student-list-toggle-row">
              <button type="button" className="button-secondary" onClick={handleToggleStudentList}>
                {showStudentList ? "ซ่อนรายชื่อนักศึกษา" : "ดูรายชื่อนักศึกษา"}
              </button>
              {showStudentList && (
                <label className="plo-cohort-prefix-filter">
                  เลือกรุ่น
                  <select
                    value={studentListCohortPrefix}
                    onChange={(e) => setStudentListCohortPrefix(e.target.value)}
                    title="กรองตารางรายชื่อนักศึกษาและตัวเลขสรุปด้านบนด้วยรุ่น (เลข 2 หลักแรกของรหัสนักศึกษา)"
                  >
                    <option value="">ทั้งหมด</option>
                    {availableStudentListCohortPrefixes.map((prefix) => (
                      <option key={prefix} value={prefix}>
                        {prefix}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {showStudentList && (
              <PLOStudentBreakdown ploId={plo.plo_id} students={filteredStudentListStudents} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
