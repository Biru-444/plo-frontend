/**
 * ทำอะไร : หน้า "ภาพรวม PLO ทั้งหลักสูตร" (route /dashboard) — สรุปวงแหวนใหญ่ "บรรลุ PLO ครบทุกข้อ"
 *          บวกการ์ด PLO แต่ละข้อ (กด filter pill กรองเป็นบรรลุแล้ว/ต้องเฝ้าระวังได้) เป็นหน้าแรกของ
 *          admin หลัง login (ดู App.jsx route "/")
 *
 * เชื่อมกับ : เรียก getCohortPLOAchievement (ตัวเลข % หลัก) คู่กับ getPLOAchievementByYear (เอาแค่
 *             course_count มารวมเป็นป้าย "N วิชาที่ใช้คำนวณ") — หลักสูตร/รุ่นที่เลือกเก็บใน URL query
 *             param เสมอ (ไม่ใช่ local state) เพื่อให้กดการ์ด PLO ไปหน้ารายละเอียดแล้วกด "กลับ" ยังเจอ
 *             filter เดิม และ refresh/แชร์ลิงก์ได้ตรง
 *
 * ถ้าแก้ : COHORT_ACHIEVED_THRESHOLD (50%) ใช้ตัดสินสีการ์ด/filter pill "บรรลุแล้ว" เท่านั้น ไม่ใช่
 *          เกณฑ์ที่ backend ใช้ตัดสินผลบรรลุรายบุคคล (all-or-nothing คนละเรื่องกัน) - ข้อความ error ทั้ง
 *          2 จุด (โหลดหลักสูตร, โหลดผลบรรลุ) ผ่าน _describeFetchError() เดียวกันเสมอ (แยก timeout/
 *          เซิร์ฟเวอร์ล่ม/เครือข่ายมีปัญหา + console.error error object เต็มๆ ไว้เสมอ) เพิ่มเข้ามาหลังจาก
 *          เจอ regression ที่วินิจฉัยยากเพราะ .catch() เดิมกลืน error ทิ้งไม่มีร่องรอยเลย
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download } from "lucide-react";
import {
  exportPLOReport,
  getCohortPLOAchievement,
  getPLOAchievementByYear,
  listCurricula,
} from "../api/client.js";
import PLODonut from "../components/PLODonut.jsx";
import PLOSummaryCard from "../components/PLOSummaryCard.jsx";

const COHORT_ACHIEVED_THRESHOLD = 50;
const PLO_REPORT_TARGET_RATE = 70;

// สร้าง <a> ชั่วคราวกดดาวน์โหลดเอง (เปิดเป็นลิงก์ตรงไม่ได้เพราะต้องแนบ Authorization header ผ่าน axios)
// ตั้งชื่อไฟล์ตามที่ backend ส่งมาใน Content-Disposition - เหมือนกับที่ CLOAchievementPanel.jsx ใช้
function _triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const FILTERS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "achieved", label: "บรรลุแล้ว" },
  { key: "at-risk", label: "ต้องเฝ้าระวัง" },
];

// แยกข้อความ error ตามสาเหตุจริง (timeout/เซิร์ฟเวอร์ล่ม/เครือข่าย) แทนข้อความเดียวกันหมดทุกกรณี - และ
// log error object เต็มๆ ไว้ใน console เสมอ (เดิมกลืน error ทิ้งใน .catch() แบบไม่มีร่องรอยเลย ทำให้
// วินิจฉัยย้อนหลังไม่ได้ว่าจริงๆ แล้ว endpoint ไหนพัง/ทำไมพัง) err.code === "ECONNABORTED" คือ axios
// timeout (client.js ตั้งไว้ 10 วินาทีใน `api` instance) err.response เป็น undefined = request ไม่ถึง
// ปลายทางเลย (เซิร์ฟเวอร์ปิดอยู่/เครือข่ายมีปัญหา/CORS) err.response.status >= 500 = เซิร์ฟเวอร์รับ
// request ได้แต่ประมวลผลพัง (ควรมี traceback ให้ดูใน backend log)
function _describeFetchError(err) {
  console.error("PLODashboard: failed to load PLO achievement data:", err);
  if (err?.code === "ECONNABORTED" || /timeout/i.test(err?.message ?? "")) {
    return "คำขอข้อมูลใช้เวลานานเกินไป (เกิน 10 วินาที) - เซิร์ฟเวอร์อาจช้าหรือข้อมูลมีเยอะเกินไป ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้";
  }
  if (!err?.response) {
    return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้";
  }
  if (err.response.status >= 500) {
    return `เซิร์ฟเวอร์ขัดข้อง (รหัส ${err.response.status}) ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้`;
  }
  return "ดึงข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบถ้ายังไม่ได้";
}

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
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

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

  async function handleExportReport() {
    setExporting(true);
    setExportError("");
    try {
      const { blob, filename } = await exportPLOReport(
        selectedCurriculumId,
        selectedCohortYear,
        PLO_REPORT_TARGET_RATE
      );
      _triggerBlobDownload(blob, filename);
    } catch (err) {
      setExportError(err?.response?.data?.detail || "Export ไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setExporting(false);
    }
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
      .catch((err) => {
        if (!cancelled) {
          setError(_describeFetchError(err));
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
      .catch((err) => {
        if (!cancelled) {
          setError(_describeFetchError(err));
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
  // TASK-plo-denominator: ตัวหาร (dataCompleteCount) เปลี่ยนจากนักศึกษาทั้งหมดเป็นนักศึกษาที่มีข้อมูล
  // ครบทุก qualifying PLO (all_plo_data_complete_count) - percent เป็น null ถ้าไม่มีใครมีข้อมูลครบเลย
  const allAchievedStats = useMemo(() => {
    if (!summary) {
      return { count: 0, percent: null, qualifying: 0, total: 0, dataCompleteCount: 0 };
    }
    // qualifying/total เป็นคุณสมบัติของ PLO/CLO setup ของหลักสูตร ไม่ใช่ของนักศึกษา - ต้องอ่านจาก
    // backend เสมอไม่ว่า total_students จะเป็น 0 หรือไม่ก็ตาม (เดิม hardcode เป็น 0 ทั้งคู่ตอนไม่มี
    // นักศึกษา ทำให้ "0 จาก 0 ข้อที่มีวิชาหลัก" โชว์ผิด ทั้งที่ backend มี total_plo_count จริงส่งมาให้
    // อยู่แล้ว) มีแค่ count/percent/dataCompleteCount ที่เป็นสถิติเกี่ยวกับนักศึกษาจริงๆ ที่ยัง fallback
    // เป็น 0/null ตอนไม่มีนักศึกษาได้ตามปกติ
    return {
      count: summary.total_students === 0 ? 0 : summary.all_plo_achieved_count,
      percent: summary.total_students === 0 ? null : summary.all_plo_achieved_percent,
      qualifying: summary.qualifying_plo_count,
      total: summary.total_plo_count,
      dataCompleteCount: summary.total_students === 0 ? 0 : summary.all_plo_data_complete_count,
    };
  }, [summary]);

  // TASK-plo-denominator: achieved_rate_percent เป็น null ได้แล้ว (ไม่มีใครมีข้อมูลของ PLO นั้นเลย) -
  // ต้องแยก "ต้องเฝ้าระวัง" (มีข้อมูลแล้วแต่ต่ำกว่าเกณฑ์) ออกจาก "ยังไม่มีข้อมูล" (ตัดสินไม่ได้เลย) ให้
  // ชัดเจน ไม่งั้น PLO ที่ไม่มีข้อมูลจะถูกนับเป็น "ต้องเฝ้าระวัง" ปนไปด้วย (null < 50 เป็น true ใน JS)
  const filteredPloSummary = useMemo(() => {
    if (!summary) return [];
    if (filterMode === "achieved") {
      return summary.plo_summary.filter(
        (plo) => plo.achieved_rate_percent !== null && plo.achieved_rate_percent >= COHORT_ACHIEVED_THRESHOLD
      );
    }
    if (filterMode === "at-risk") {
      return summary.plo_summary.filter(
        (plo) => plo.achieved_rate_percent !== null && plo.achieved_rate_percent < COHORT_ACHIEVED_THRESHOLD
      );
    }
    return summary.plo_summary;
  }, [summary, filterMode]);

  const atRiskCount = useMemo(
    () =>
      summary
        ? summary.plo_summary.filter(
            (plo) => plo.achieved_rate_percent !== null && plo.achieved_rate_percent < COHORT_ACHIEVED_THRESHOLD
          ).length
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

          <button
            type="button"
            className="button-secondary"
            onClick={handleExportReport}
            disabled={exporting || !selectedCurriculumId}
          >
            <Download size={16} strokeWidth={2} />
            {exporting ? "กำลังสร้างไฟล์..." : "Export รายงาน PLO (Excel)"}
          </button>
        </div>
      )}

      {exportError && <p className="error-message">{exportError}</p>}
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
                {allAchievedStats.count} จาก {allAchievedStats.dataCompleteCount} คนที่มีข้อมูลครบทุก PLO
                (ทั้งหมด {summary.total_students} คน) · {summary.curriculum_name}
              </span>
              <span className="dashboard-hero-sub">
                ({allAchievedStats.qualifying} จาก {allAchievedStats.total} ข้อที่มีวิชาหลัก)
              </span>
              <span className="dashboard-hero-sub">{totalCourseCount} วิชาที่ใช้คำนวณ</span>
            </div>
          </div>

          {summary.total_students === 0 && (
            <p className="student-list-empty">หลักสูตรนี้ยังไม่มีนักศึกษา</p>
          )}

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
                achievedCount={plo.achieved_student_count}
                totalStudents={summary.total_students}
                studentCountWithData={plo.student_count_with_data}
                coveragePercent={plo.coverage_percent}
                hasCloMapping={plo.has_clo_mapping}
                isAchieved={
                  plo.achieved_rate_percent !== null && plo.achieved_rate_percent >= COHORT_ACHIEVED_THRESHOLD
                }
                to={`/plo/overview/${plo.plo_id}${detailQuery}`}
              />
            ))}
          </div>

          {filteredPloSummary.length === 0 && (
            <p className="student-list-empty">ไม่มี PLO ในหมวดนี้</p>
          )}
        </>
      )}
    </div>
  );
}
