import { useEffect, useState } from "react";
import { getCohortPLOAchievement, listCurricula } from "../api/client.js";
import PLOCohortBar from "../components/PLOCohortBar.jsx";
import PLOStudentBreakdown from "../components/PLOStudentBreakdown.jsx";

const COHORT_ACHIEVED_THRESHOLD = 50;

export default function PLODashboard() {
  const [curricula, setCurricula] = useState([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadingCurricula, setLoadingCurricula] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPloId, setExpandedPloId] = useState(null);

  function handleSelectCurriculum(curriculumId) {
    setSelectedCurriculumId(curriculumId);
    setExpandedPloId(null);
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
          setError("เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาตรวจสอบว่า backend กำลังทำงานอยู่");
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
          setError("เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาตรวจสอบว่า backend กำลังทำงานอยู่");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSummary(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCurriculumId]);

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
          <div className="dashboard-summary">
            <h2>{summary.curriculum_name}</h2>
            <p className="achievement-count">นักศึกษาทั้งหมด {summary.total_students} คน</p>
          </div>

          {summary.total_students === 0 ? (
            <p className="student-list-empty">หลักสูตรนี้ยังไม่มีนักศึกษา</p>
          ) : (
            <div className="plo-list">
              {summary.plo_summary.map((plo) => {
                const isExpandable = summary.students.length > 0;
                const isExpanded = isExpandable && expandedPloId === plo.plo_id;
                return (
                  <div key={plo.plo_id}>
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
          )}
        </>
      )}
    </div>
  );
}
