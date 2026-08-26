import { useEffect, useMemo, useState } from "react";
import { getCohortPLOAchievement, listCurricula } from "../api/client.js";
import PLODonut from "../components/PLODonut.jsx";
import PLOCohortBar from "../components/PLOCohortBar.jsx";
import PLOStudentBreakdown from "../components/PLOStudentBreakdown.jsx";

const COHORT_ACHIEVED_THRESHOLD = 50;

const FILTERS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "achieved", label: "บรรลุแล้ว" },
  { key: "at-risk", label: "ต้องเฝ้าระวัง" },
];

export default function PLODashboard() {
  const [curricula, setCurricula] = useState([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadingCurricula, setLoadingCurricula] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPloId, setExpandedPloId] = useState(null);
  const [filterMode, setFilterMode] = useState("all");

  function handleSelectCurriculum(curriculumId) {
    setSelectedCurriculumId(curriculumId);
    setExpandedPloId(null);
    setFilterMode("all");
  }

  function toggleExpandedPlo(ploId) {
    setExpandedPloId((prev) => (prev === ploId ? null : ploId));
  }

  useEffect(() => {
    let cancelled = false;

    listCurricula()
      .then((data) => {
        if (cancelled) return;
        setCurricula(data);
        if (data.length > 0) {
          setSelectedCurriculumId(data[0].id);
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
  }, []);

  useEffect(() => {
    if (selectedCurriculumId == null) return;

    let cancelled = false;
    setLoadingSummary(true);
    setError(null);

    getCohortPLOAchievement(selectedCurriculumId)
      .then((data) => {
        if (!cancelled) setSummary(data);
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
  }, [selectedCurriculumId]);

  const allAchievedStats = useMemo(() => {
    if (!summary || summary.total_students === 0) return { count: 0, percent: null };
    const count = summary.students.filter(
      (s) => s.plo_achievements.length > 0 && s.plo_achievements.every((p) => p.is_achieved)
    ).length;
    return { count, percent: (count / summary.total_students) * 100 };
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
                {filteredPloSummary.map((plo) => {
                  const isExpandable = summary.students.length > 0;
                  const isExpanded = isExpandable && expandedPloId === plo.plo_id;
                  return (
                    <div
                      key={plo.plo_id}
                      className={`plo-grid-item ${isExpanded ? "plo-grid-item-expanded" : ""}`}
                    >
                      <PLOCohortBar
                        code={plo.plo_code}
                        description={plo.description}
                        averagePercent={plo.average_achieved_percent}
                        isAchieved={plo.achieved_rate_percent >= COHORT_ACHIEVED_THRESHOLD}
                        achievedStudentCount={plo.achieved_student_count}
                        totalStudents={summary.total_students}
                        achievedRatePercent={plo.achieved_rate_percent}
                        isExpandable={isExpandable}
                        isExpanded={isExpanded}
                        onToggle={() => toggleExpandedPlo(plo.plo_id)}
                      />
                      {isExpanded && (
                        <PLOStudentBreakdown ploId={plo.plo_id} students={summary.students} />
                      )}
                    </div>
                  );
                })}
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
