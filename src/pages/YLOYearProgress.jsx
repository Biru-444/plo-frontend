import { useEffect, useState } from "react";
import { getYLOAchievement, listYLO, listCurricula } from "../api/client.js";
import PLODonut from "../components/PLODonut.jsx";
import YLOStudentBreakdown from "../components/YLOStudentBreakdown.jsx";

// ชั้นปีมี 4 ระดับเสมอตามโครงสร้างหลักสูตร
const YEAR_LEVELS = [1, 2, 3, 4];
// เกณฑ์เดียวกับที่ใช้ตัดสินสีวงแหวน/badge ระดับกลุ่มในหน้า PLO (COHORT_ACHIEVED_THRESHOLD)
const COHORT_ACHIEVED_THRESHOLD = 50;

export default function YLOYearProgress() {
  const [curricula, setCurricula] = useState([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState(null);
  const [ylos, setYlos] = useState([]);
  const [selectedYearLevel, setSelectedYearLevel] = useState(YEAR_LEVELS[0]);
  // เพิ่งเพิ่มรอบนี้ (เดิมหน้านี้ไม่มี เพราะตอนนั้นยังไม่มีตัวเลข % บรรลุให้กรอง) - ไม่มีตัวกรองนี้
  // ตัวเลข % จะถูกเจือจางด้วยนักศึกษาจริง 171 คนที่ยังไม่มีคะแนนเลย เหมือนที่เจอตอนทำหน้า PLO
  const [selectedCohortYear, setSelectedCohortYear] = useState(null);
  const [achievement, setAchievement] = useState(null);
  const [loadingCurricula, setLoadingCurricula] = useState(true);
  const [loadingYlos, setLoadingYlos] = useState(false);
  const [loadingAchievement, setLoadingAchievement] = useState(false);
  const [error, setError] = useState(null);
  // ตาราง "รหัสนักศึกษา/ชื่อ-นามสกุล/% บรรลุ" ซ่อนไว้ก่อนเป็นค่าเริ่มต้น ผู้ใช้ต้องกดปุ่มเปิดเองชัดเจน
  // (แทนของเดิมที่ผูกกับ "กดวงแหวนแล้ว" ซึ่งเปิดได้ทางเดียว ไม่มีปุ่มปิดกลับเลย - pattern เดียวกับที่
  // เปลี่ยนไปแล้วในหน้า PLO เมื่อ 2 รอบก่อน ดู PLODetailPage.jsx/showStudentList) เป็น state เดียว ไม่ใช่
  // Set ต่อชั้นปีเหมือนเดิม เพราะ reset กลับเป็นซ่อนทุกครั้งที่สลับปี/รุ่นอยู่แล้ว ไม่ต้องจำไว้ข้ามปี
  const [showStudentList, setShowStudentList] = useState(false);

  function handleSelectCurriculum(curriculumId) {
    setSelectedCurriculumId(curriculumId);
    setSelectedYearLevel(YEAR_LEVELS[0]);
    setSelectedCohortYear(null);
    setShowStudentList(false);
  }

  function handleSelectYear(yearLevel) {
    setSelectedYearLevel(yearLevel);
    setShowStudentList(false);
  }

  function handleSelectCohortYear(cohortYear) {
    setSelectedCohortYear(cohortYear);
    setShowStudentList(false);
  }

  function handleToggleStudentList() {
    setShowStudentList((prev) => !prev);
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
    setLoadingYlos(true);
    setError(null);

    listYLO(selectedCurriculumId)
      .then((data) => {
        if (!cancelled) setYlos(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError("ดึงข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingYlos(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCurriculumId]);

  useEffect(() => {
    if (selectedCurriculumId == null) return;

    let cancelled = false;
    setLoadingAchievement(true);

    getYLOAchievement(selectedCurriculumId, selectedYearLevel, selectedCohortYear)
      .then((data) => {
        if (!cancelled) setAchievement(data);
      })
      .catch(() => {
        if (!cancelled) setAchievement(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingAchievement(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCurriculumId, selectedYearLevel, selectedCohortYear]);

  const yloByYear = {};
  ylos.forEach((y) => {
    yloByYear[y.year_level] = y;
  });
  const currentYlo = yloByYear[selectedYearLevel];
  const isAchievedOverall =
    achievement != null && achievement.achieved_rate_percent >= COHORT_ACHIEVED_THRESHOLD;

  return (
    <div className="page">
      <h1>YLO ตามชั้นปี</h1>

      {!loadingCurricula && curricula.length > 0 && (
        <div className="dashboard-toolbar">
          <label htmlFor="ylo-year-progress-curriculum-select">หลักสูตร</label>
          <select
            id="ylo-year-progress-curriculum-select"
            value={selectedCurriculumId ?? ""}
            onChange={(e) => handleSelectCurriculum(Number(e.target.value))}
          >
            {curricula.map((curriculum) => (
              <option key={curriculum.id} value={curriculum.id}>
                {curriculum.name} ({curriculum.year})
              </option>
            ))}
          </select>

          {achievement && achievement.available_cohort_years.length > 0 && (
            <>
              <label htmlFor="ylo-year-progress-cohort-select">รุ่นที่เข้าเรียน</label>
              <select
                id="ylo-year-progress-cohort-select"
                value={selectedCohortYear ?? ""}
                onChange={(e) =>
                  handleSelectCohortYear(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">ทุกรุ่น</option>
                {achievement.available_cohort_years.map((year) => (
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

      {!loadingCurricula && !error && loadingYlos && (
        <p className="loading-message">กำลังโหลดข้อมูล...</p>
      )}

      {!loadingCurricula && !error && !loadingYlos && selectedCurriculumId != null && (
        <>
          <div className="cohort-tabs">
            {YEAR_LEVELS.map((yearLevel) => (
              <button
                key={yearLevel}
                type="button"
                className={`cohort-tab ${yearLevel === selectedYearLevel ? "selected" : ""}`}
                onClick={() => handleSelectYear(yearLevel)}
              >
                ชั้นปีที่ {yearLevel}
              </button>
            ))}
          </div>

          <div className="year-progress-list">
            <div className="year-progress-card">
              <div className="year-progress-header">
                <h2>ชั้นปีที่ {selectedYearLevel}</h2>
              </div>

              <div className="ylo-description-box">
                <span className="ylo-description-label">เป้าหมายของปีนี้ (YLO)</span>
                <p>{currentYlo?.description || "ไม่มีข้อมูล YLO สำหรับปีนี้"}</p>
              </div>

              {loadingAchievement && <p className="loading-message">กำลังโหลดข้อมูล...</p>}

              {!loadingAchievement && achievement && achievement.total_students > 0 && (
                <>
                  <div className="dashboard-hero">
                    <PLODonut
                      percent={achievement.achieved_rate_percent}
                      size={100}
                      color={isAchievedOverall ? "var(--color-green-700)" : "var(--color-red-700)"}
                    />
                    <div className="dashboard-hero-text">
                      <span className="dashboard-hero-number">
                        {achievement.achieved_rate_percent.toFixed(0)}%
                      </span>
                      <span className="dashboard-hero-label">นักศึกษาบรรลุ YLO ปีนี้</span>
                      <span className="dashboard-hero-sub">
                        {achievement.achieved_student_count} จาก {achievement.total_students} คน
                      </span>
                    </div>
                  </div>

                  <div className="plo-student-list-toggle-row">
                    <button type="button" className="button-secondary" onClick={handleToggleStudentList}>
                      {showStudentList ? "ซ่อนรายชื่อนักศึกษา" : "ดูรายชื่อนักศึกษา"}
                    </button>
                  </div>

                  {showStudentList && <YLOStudentBreakdown students={achievement.students} />}
                </>
              )}

              {!loadingAchievement && achievement && achievement.total_students === 0 && (
                <p className="student-list-empty">หลักสูตรนี้ยังไม่มีนักศึกษา</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
