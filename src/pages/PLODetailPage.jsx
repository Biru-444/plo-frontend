import { useEffect, useState } from "react";
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
            averagePercent={plo.average_achieved_percent}
            isAchieved={plo.achieved_rate_percent >= COHORT_ACHIEVED_THRESHOLD}
            achievedStudentCount={plo.achieved_student_count}
            totalStudents={summary.total_students}
            achievedRatePercent={plo.achieved_rate_percent}
            isExpandable={false}
          />
          <div className="plo-expanded-detail">
            <PLOCourseBreakdown
              ploId={plo.plo_id}
              cohortYear={cohortYear ? Number(cohortYear) : null}
              context={context}
              curriculumId={curriculumId}
            />
            <PLOStudentBreakdown ploId={plo.plo_id} students={summary.students} />
          </div>
        </>
      )}
    </div>
  );
}
