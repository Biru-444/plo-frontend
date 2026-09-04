import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getCohortPLOAchievement, getPLOAchievementByYear, listCurricula } from "../api/client.js";
import PLOSummaryCard from "../components/PLOSummaryCard.jsx";

const COHORT_ACHIEVED_THRESHOLD = 50;

export default function PLOYearProgress() {
  // เหมือน PLODashboard - หลักสูตร/รุ่นอยู่ใน URL query param เสมอ ไม่ใช่ local state เฉยๆ กันไม่ให้
  // filter หายตอนกดการ์ด PLO ไปหน้ารายละเอียดแล้วกด "กลับ" หรือ refresh หน้า
  const [searchParams, setSearchParams] = useSearchParams();
  const [curricula, setCurricula] = useState([]);
  // สูตรเดียวกับหน้า "ภาพรวม PLO" (PLODashboard) - PLO คือผลลัพธ์รวมทั้งหลักสูตร ไม่แยกปี ต่างจาก YLO
  // ที่เป็นบันไดรายปีโดยตรง จึงใช้ endpoint เดียวกันแทนคำนวณเองใหม่ กันตัวเลขสองสูตร drift ไม่ตรงกัน
  const [summary, setSummary] = useState(null);
  const [totalCourseCount, setTotalCourseCount] = useState(0);
  const [loadingCurricula, setLoadingCurricula] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState(null);

  const selectedCurriculumId = searchParams.get("curriculum") ? Number(searchParams.get("curriculum")) : null;
  const selectedCohortYear = searchParams.get("cohort") ? Number(searchParams.get("cohort")) : null;

  function handleSelectCurriculum(curriculumId) {
    setSearchParams({ curriculum: String(curriculumId) });
  }

  function handleSelectCohortYear(cohortYear) {
    const next = new URLSearchParams(searchParams);
    if (cohortYear) next.set("cohort", String(cohortYear));
    else next.delete("cohort");
    setSearchParams(next);
  }

  useEffect(() => {
    let cancelled = false;

    listCurricula()
      .then((data) => {
        if (cancelled) return;
        setCurricula(data);
        if (data.length > 0 && !searchParams.get("curriculum")) {
          setSearchParams({ curriculum: String(data[0].id) }, { replace: true });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("ดึงข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCurricula(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedCurriculumId == null) return;

    let cancelled = false;
    setLoadingSummary(true);
    setError(null);

    Promise.all([
      getCohortPLOAchievement(selectedCurriculumId, selectedCohortYear),
      // เอาแค่ course_count มารวมทุกปีสำหรับป้าย "N วิชาที่ใช้คำนวณ" - StudyPlan unique constraint คือ
      // (curriculum_id, course_id, cohort_year) ไม่รวม year_level เลยการันตีว่าวิชาเดียวกันจะถูกนับ
      // ที่ปีเดียวเสมอ รวมยอด 4 ปีแล้วไม่มีทางนับซ้ำ
      getPLOAchievementByYear(selectedCurriculumId, selectedCohortYear),
    ])
      .then(([summaryData, byYearData]) => {
        if (cancelled) return;
        setSummary(summaryData);
        setTotalCourseCount(byYearData.years.reduce((sum, year) => sum + year.course_count, 0));
      })
      .catch(() => {
        if (!cancelled) {
          setError("ดึงข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSummary(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCurriculumId, selectedCohortYear]);

  const detailQuery = `?curriculum=${selectedCurriculumId}${
    selectedCohortYear ? `&cohort=${selectedCohortYear}` : ""
  }`;

  return (
    <div className="page">
      <h1>PLO เมื่อจบการศึกษา</h1>

      {!loadingCurricula && curricula.length > 0 && (
        <div className="dashboard-toolbar">
          <label htmlFor="plo-graduation-curriculum-select">หลักสูตร</label>
          <select
            id="plo-graduation-curriculum-select"
            value={selectedCurriculumId ?? ""}
            onChange={(e) => handleSelectCurriculum(Number(e.target.value))}
          >
            {curricula.map((curriculum) => (
              <option key={curriculum.id} value={curriculum.id}>
                {curriculum.name} ({curriculum.year})
              </option>
            ))}
          </select>

          {summary && summary.available_cohort_years.length > 0 && (
            <>
              <label htmlFor="plo-graduation-cohort-select">รุ่นที่เข้าเรียน</label>
              <select
                id="plo-graduation-cohort-select"
                value={selectedCohortYear ?? ""}
                onChange={(e) => handleSelectCohortYear(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">ทุกรุ่น</option>
                {summary.available_cohort_years.map((year) => (
                  <option key={year} value={year}>
                    รุ่น {year}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

      {error && <p className="error-message">{error}</p>}

      {loadingCurricula && <p className="loading-message">กำลังโหลดข้อมูล...</p>}

      {!loadingCurricula && !error && loadingSummary && (
        <p className="loading-message">กำลังโหลดข้อมูล...</p>
      )}

      {!loadingCurricula && !error && !loadingSummary && summary && (
        <div className="year-progress-list">
          <div className="year-progress-card">
            <div className="year-progress-header">
              <h2>ผลบรรลุ PLO ทั้งหมด</h2>
              <span className="year-progress-course-count">{totalCourseCount} วิชาที่ใช้คำนวณ</span>
            </div>

            <div className="plo-grid">
              {summary.plo_summary.map((plo) => (
                <PLOSummaryCard
                  key={plo.plo_id}
                  code={plo.plo_code}
                  description={plo.description}
                  achievedRatePercent={plo.achieved_rate_percent}
                  isAchieved={plo.achieved_rate_percent >= COHORT_ACHIEVED_THRESHOLD}
                  to={`/plo/cohort/${plo.plo_id}${detailQuery}`}
                />
              ))}
            </div>

            {summary.plo_summary.length === 0 && (
              <p className="student-list-empty">หลักสูตรนี้ยังไม่ได้กำหนด PLO ไว้เลย</p>
            )}

            {summary.plo_summary.length > 0 && summary.total_students === 0 && (
              <p className="student-list-empty">หลักสูตรนี้ยังไม่มีนักศึกษา</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
