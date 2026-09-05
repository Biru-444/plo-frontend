import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getCohortPLOAchievement, getPLOAchievementByYear, listCurricula } from "../api/client.js";
import PLODonut from "../components/PLODonut.jsx";
import PLOSummaryCard from "../components/PLOSummaryCard.jsx";

const COHORT_ACHIEVED_THRESHOLD = 50;

const FILTERS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "achieved", label: "บรรลุแล้ว" },
  { key: "at-risk", label: "ต้องเฝ้าระวัง" },
];

export default function PLODashboard() {
  // หลักสูตร/รุ่นที่เลือกอยู่ใน URL query param เสมอ (ไม่ใช่ local state เฉยๆ เหมือนก่อนงานนี้) - เพื่อให้
  // กดการ์ด PLO ไปหน้ารายละเอียดแล้วค่อยกด "กลับ" ยังเจอ filter เดิม และ refresh/แชร์ลิงก์ได้ตรงด้วย
  const [searchParams, setSearchParams] = useSearchParams();
  const [curricula, setCurricula] = useState([]);
  const [summary, setSummary] = useState(null);
  const [totalCourseCount, setTotalCourseCount] = useState(0);
  const [loadingCurricula, setLoadingCurricula] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState(null);
  const [filterMode, setFilterMode] = useState("all");

  const selectedCurriculumId = searchParams.get("curriculum") ? Number(searchParams.get("curriculum")) : null;
  const selectedCohortYear = searchParams.get("cohort") ? Number(searchParams.get("cohort")) : null;

  function handleSelectCurriculum(curriculumId) {
    setFilterMode("all");
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
        // ยังไม่มีหลักสูตรใน URL เลย (เข้าหน้านี้ครั้งแรก) - เติมค่าเริ่มต้นเป็นหลักสูตรแรกลง URL ไปเลย
        // กันไม่ให้ query param ว่างเปล่าตอน refresh/กดกลับจากหน้ารายละเอียด
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

    // ยิงคู่กับ /plo/achievement/by-year เพื่อเอาแค่ course_count มารวมทุกปีสำหรับป้าย "N วิชาที่ใช้
    // คำนวณ" (เดิมมีเฉพาะหน้า "PLO เมื่อจบการศึกษา" ก่อนรวมหน้า) - StudyPlan unique constraint คือ
    // (curriculum_id, course_id, cohort_year) ไม่รวม year_level เลยการันตีว่าวิชาเดียวกันจะถูกนับที่
    // ปีเดียวเสมอ รวมยอด 4 ปีแล้วไม่มีทางนับซ้ำ - ตัวเลข achievement % ยังคงมาจาก
    // getCohortPLOAchievement ตัวเดียวเหมือนเดิมทุกประการ ไม่แตะ
    Promise.all([
      getCohortPLOAchievement(selectedCurriculumId, selectedCohortYear),
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

  // "ครบทุกข้อ" มาจาก backend แล้ว (all_plo_achieved_count/percent) - นับเฉพาะ PLO ที่มีวิชา "หลัก"
  // ผ่านเกณฑ์คำนวณจริงอย่างน้อย 1 วิชา (qualifying_plo_count/total_plo_count) ไม่ใช่ครบ 9 ข้อเสมอไป
  // เพราะ PLO ที่ไม่มีวิชาเชื่อมเลยเป็นไปไม่ได้ที่จะบรรลุอยู่แล้วโดยดีไซน์ (ดู plo_calculation.py) -
  // เดิมคำนวณฝั่ง frontend เองจาก summary.students[].plo_achievements ทุกข้อ ย้ายไป backend แล้ว
  const allAchievedStats = useMemo(() => {
    if (!summary || summary.total_students === 0) return { count: 0, percent: null, qualifying: 0, total: 0 };
    return {
      count: summary.all_plo_achieved_count,
      percent: summary.all_plo_achieved_percent,
      qualifying: summary.qualifying_plo_count,
      total: summary.total_plo_count,
    };
  }, [summary]);

  const filteredPloSummary = useMemo(() => {
    if (!summary) return [];
    if (filterMode === "achieved") {
      return summary.plo_summary.filter((plo) => plo.achieved_rate_percent >= COHORT_ACHIEVED_THRESHOLD);
    }
    if (filterMode === "at-risk") {
      return summary.plo_summary.filter((plo) => plo.achieved_rate_percent < COHORT_ACHIEVED_THRESHOLD);
    }
    return summary.plo_summary;
  }, [summary, filterMode]);

  const atRiskCount = useMemo(
    () =>
      summary
        ? summary.plo_summary.filter((plo) => plo.achieved_rate_percent < COHORT_ACHIEVED_THRESHOLD).length
        : 0,
    [summary]
  );

  // ต่อให้ URL query param เดียวกันนี้ไปกับการ์ดที่กด เพื่อให้หน้ารายละเอียดรู้บริบท และกด "กลับ" แล้ว
  // filter เดิมยังอยู่ (อ่านจาก URL ตรงๆ ไม่ใช่ state ที่หายไปตอน refresh)
  const detailQuery = `?curriculum=${selectedCurriculumId}${
    selectedCohortYear ? `&cohort=${selectedCohortYear}` : ""
  }`;

  return (
    <div className="page">
      <h1>ภาพรวม PLO ทั้งหลักสูตร</h1>

      {!loadingCurricula && curricula.length > 0 && (
        <div className="dashboard-toolbar">
          <label htmlFor="curriculum-select">หลักสูตร</label>
          <select
            id="curriculum-select"
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
              <label htmlFor="cohort-year-select">รุ่นที่เข้าเรียน</label>
              <select
                id="cohort-year-select"
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
        <>
          <div className="dashboard-hero">
            <PLODonut percent={allAchievedStats.percent} size={140} color="var(--color-purple-700)" />
            <div className="dashboard-hero-text">
              <span className="dashboard-hero-number">
                {allAchievedStats.percent === null ? "-" : `${allAchievedStats.percent.toFixed(0)}%`}
              </span>
              <span className="dashboard-hero-label">นักศึกษาบรรลุ PLO ครบทุกข้อ</span>
              <span className="dashboard-hero-sub">
                {allAchievedStats.count} จาก {summary.total_students} คน · {summary.curriculum_name}
              </span>
              <span className="dashboard-hero-sub">
                ({allAchievedStats.qualifying} จาก {allAchievedStats.total} ข้อที่มีวิชาหลัก)
              </span>
              <span className="dashboard-hero-sub">{totalCourseCount} วิชาที่ใช้คำนวณ</span>
            </div>
          </div>

          {summary.total_students === 0 ? (
            <p className="student-list-empty">หลักสูตรนี้ยังไม่มีนักศึกษา</p>
          ) : (
            <>
              <div className="plo-filter-pills">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={`plo-filter-pill ${filterMode === f.key ? "active" : ""}`}
                    onClick={() => setFilterMode(f.key)}
                  >
                    {f.label}
                    {f.key === "at-risk" && atRiskCount > 0 && (
                      <span className="plo-filter-pill-count">{atRiskCount}</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="plo-grid">
                {filteredPloSummary.map((plo) => (
                  <PLOSummaryCard
                    key={plo.plo_id}
                    code={plo.plo_code}
                    description={plo.description}
                    achievedRatePercent={plo.achieved_rate_percent}
                    isAchieved={plo.achieved_rate_percent >= COHORT_ACHIEVED_THRESHOLD}
                    to={`/plo/overview/${plo.plo_id}${detailQuery}`}
                  />
                ))}
              </div>

              {filteredPloSummary.length === 0 && (
                <p className="student-list-empty">ไม่มี PLO ในหมวดนี้</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
