import { useEffect, useState } from "react";
import { getPLOAchievementByYear, listCurricula } from "../api/client.js";
import PLOCohortBar from "../components/PLOCohortBar.jsx";
import PLOStudentBreakdown from "../components/PLOStudentBreakdown.jsx";

const COHORT_ACHIEVED_THRESHOLD = 50;

export default function PLOYearProgress() {
  const [curricula, setCurricula] = useState([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loadingCurricula, setLoadingCurricula] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [error, setError] = useState(null);
  // key: `${year_level}-${plo_id}` -> เก็บว่าแถบไหนกางอยู่ (แยกกันคนละปี)
  const [expandedKey, setExpandedKey] = useState(null);
  // เลือกดูทีละชั้นปีแทนการเลื่อนดูทั้งหมด (เดิมต้องเลื่อนยาวมากกว่าจะถึงปี 4)
  const [selectedYearLevel, setSelectedYearLevel] = useState(null);

  function handleSelectCurriculum(curriculumId) {
    setSelectedCurriculumId(curriculumId);
    setExpandedKey(null);
    setSelectedYearLevel(null);
  }

  function handleSelectYear(yearLevel) {
    setSelectedYearLevel(yearLevel);
    setExpandedKey(null);
  }

  function toggleExpanded(key) {
    setExpandedKey((prev) => (prev === key ? null : key));
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
    setLoadingProgress(true);
    setError(null);

    getPLOAchievementByYear(selectedCurriculumId)
      .then((data) => {
        if (cancelled) return;
        setProgress(data);
        if (data.years.length > 0) setSelectedYearLevel(data.years[0].year_level);
      })
      .catch(() => {
        if (!cancelled) {
          setError("ดึงข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProgress(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCurriculumId]);

  return (
    <div className="page">
      <h1>PLO ตามชั้นปี</h1>

      {!loadingCurricula && curricula.length > 0 && (
        <div className="dashboard-toolbar">
          <label htmlFor="year-progress-curriculum-select">หลักสูตร</label>
          <select
            id="year-progress-curriculum-select"
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

      {!loadingCurricula && !error && loadingProgress && (
        <p className="loading-message">กำลังโหลดข้อมูล...</p>
      )}

      {!loadingCurricula && !error && !loadingProgress && progress && (
        <>
          {progress.years.length > 0 && (
            <div className="cohort-tabs">
              {progress.years.map((year) => (
                <button
                  key={year.year_level}
                  type="button"
                  className={`cohort-tab ${
                    year.year_level === selectedYearLevel ? "selected" : ""
                  }`}
                  onClick={() => handleSelectYear(year.year_level)}
                >
                  ชั้นปีที่ {year.year_level}
                </button>
              ))}
            </div>
          )}

          <div className="year-progress-list">
            {progress.years
              .filter((year) => year.year_level === selectedYearLevel)
              .map((year) => {
                const totalStudents = year.students.length;
                const isExpandable = totalStudents > 0;
                // แสดงเฉพาะ PLO ที่ YLO ปีนี้กำหนดไว้จริง (ผูกผ่าน YLO-PLO mapping) - ปีไหนไม่ได้
                // เก็บ PLO ตัวไหน ก็ไม่ต้องโชว์ PLO ตัวนั้นให้รกหน้า
                const expectedPlos = year.plo_summary.filter((plo) => plo.is_expected_this_year);

                return (
                  <div className="year-progress-card" key={year.year_level}>
                    <div className="year-progress-header">
                      <h2>ชั้นปีที่ {year.year_level}</h2>
                      <span className="year-progress-course-count">
                        {year.course_count} วิชาที่ใช้คำนวณ
                      </span>
                    </div>

                    <div className="ylo-description-box">
                      <span className="ylo-description-label">เป้าหมายของปีนี้ (YLO)</span>
                      <p>{year.ylo_description || "ไม่มีข้อมูล YLO สำหรับปีนี้"}</p>
                    </div>

                    <div className="plo-list">
                      {expectedPlos.map((plo) => {
                        const key = `${year.year_level}-${plo.plo_id}`;
                        const isExpanded = isExpandable && expandedKey === key;
                        return (
                          <div key={plo.plo_id}>
                            <PLOCohortBar
                              code={plo.plo_code}
                              description={plo.description}
                              averagePercent={plo.average_achieved_percent}
                              isAchieved={plo.achieved_rate_percent >= COHORT_ACHIEVED_THRESHOLD}
                              achievedStudentCount={plo.achieved_student_count}
                              totalStudents={totalStudents}
                              achievedRatePercent={plo.achieved_rate_percent}
                              isExpandable={isExpandable}
                              isExpanded={isExpanded}
                              onToggle={() => toggleExpanded(key)}
                            />
                            {isExpanded && (
                              <PLOStudentBreakdown ploId={plo.plo_id} students={year.students} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {expectedPlos.length === 0 && (
                      <p className="student-list-empty">
                        ปีนี้ยังไม่ได้กำหนด PLO เป้าหมายไว้ (ยังไม่ได้ผูก YLO ปีนี้กับ PLO ตัวไหนเลย)
                      </p>
                    )}

                    {expectedPlos.length > 0 && totalStudents === 0 && (
                      <p className="student-list-empty">หลักสูตรนี้ยังไม่มีนักศึกษา</p>
                    )}
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}
