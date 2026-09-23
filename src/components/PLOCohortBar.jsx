import PLODonut from "./PLODonut.jsx";

const KEYWORD_MAX_LENGTH = 60;

function truncate(text, max) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

/**
 * Compact card showing how many students achieved one PLO across a whole
 * curriculum cohort (achievedStudentCount / totalStudents), not a percent.
 * Green when isAchieved, warm red otherwise. Clickable when isExpandable to
 * toggle a per-student breakdown table (rendered by the caller). Full
 * description is on a hover tooltip - only a short excerpt shows inline so
 * the card stays scannable.
 */
export default function PLOCohortBar({
  code,
  description,
  isAchieved,
  achievedStudentCount,
  totalStudents,
  achievedRatePercent,
  // TASK-plo-denominator: จำนวน/สัดส่วนนักศึกษาที่มีข้อมูลของ PLO นี้ - undefined = ผู้เรียกยังไม่ส่งมา
  // (เข้ากันได้กับที่เรียกเก่า) ถือว่า "มีข้อมูลเท่ากับทั้งหมด" ไปก่อน
  studentCountWithData,
  coveragePercent,
  isExpandable = false,
  isExpanded = false,
  onToggle,
  // undefined (default) = ไม่ใช้ฟีเจอร์นี้เลย เหมือนพฤติกรรมเดิมของหน้า /dashboard - true/false ไว้เผื่อ
  // อนาคตอยากเน้น PLO ที่ YLO ปีนั้นคาดหวัง แต่ปัจจุบันยังไม่มีผู้เรียกส่งค่านี้มาจากที่ไหนเลย (ไม่มีหน้า
  // ไหน pass isExpectedThisYear แล้วตอนนี้ หลังรวมหน้า "ภาพรวม PLO"/"PLO เมื่อจบการศึกษา" เป็นหน้าเดียว)
  isExpectedThisYear,
}) {
  const expectationClass =
    isExpectedThisYear === undefined
      ? ""
      : isExpectedThisYear
      ? "expected-this-year"
      : "not-expected-this-year";

  // achievedRatePercent = null (TASK-plo-denominator) หมายถึงไม่มีใครมีข้อมูลของ PLO นี้เลย - ต้องแสดง
  // "ยังไม่มีข้อมูล" (เทา) แทน "ไม่บรรลุ" (แดง) เพราะยังตัดสินไม่ได้เลยว่าบรรลุหรือไม่ ไม่ใช่สอบตก
  const hasData = achievedRatePercent !== null && achievedRatePercent !== undefined;
  const statusClass = !hasData ? "no-data" : isAchieved ? "at-goal" : "at-risk";
  const resolvedColor = !hasData ? "var(--color-gray-400)" : isAchieved ? "var(--color-green-700)" : "var(--color-red-700)";

  function handleKeyDown(e) {
    if (!isExpandable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  }

  return (
    <div
      className={`plo-bar-row ${statusClass} ${isExpandable ? "expandable" : ""} ${expectationClass}`}
      onClick={isExpandable ? onToggle : undefined}
      onKeyDown={handleKeyDown}
      role={isExpandable ? "button" : undefined}
      tabIndex={isExpandable ? 0 : undefined}
      aria-expanded={isExpandable ? isExpanded : undefined}
    >
      <div className="plo-bar-header">
        {isExpandable && (
          <span className={`expand-icon ${isExpanded ? "expanded" : ""}`}>▸</span>
        )}
        <span className="plo-code">{code}</span>
        <span className={`plo-badge ${!hasData ? "no-data" : isAchieved ? "achieved" : "not-achieved"}`}>
          {!hasData ? "ยังไม่มีข้อมูล" : isAchieved ? "บรรลุ" : "ไม่บรรลุ"}
        </span>
        {isExpectedThisYear && <span className="plo-year-target-badge">เป้าหมายปีนี้</span>}
      </div>
      <p className="plo-keyword" title={description}>
        {truncate(description, KEYWORD_MAX_LENGTH)}
      </p>
      <div className="plo-bar-stats">
        {/* วงแหวนโชว์สัดส่วนคนบรรลุด้วยสี ไม่โชว์ตัวเลข % (hideLabel) - สีระบุเองจาก isAchieved/hasData
            ที่ผู้เรียกคำนวณมาแล้ว (เกณฑ์ในระบบนี้คือ 50% ไม่ใช่ 60% ที่ PLODonut ใช้เป็นค่า default ถ้าไม่
            ระบุสี) */}
        <PLODonut percent={achievedRatePercent} size={48} color={resolvedColor} hideLabel />
        <div className="plo-bar-stats-text">
          <div className="plo-bar-percent">
            {hasData
              ? `บรรลุ ${achievedStudentCount} จาก ${studentCountWithData ?? totalStudents} คนที่มีข้อมูล`
              : "ยังไม่มีข้อมูลให้ตัดสิน"}
          </div>
          {studentCountWithData !== undefined && coveragePercent !== undefined && (
            <div className="plo-bar-coverage">
              จากนักศึกษาทั้งหมด {totalStudents} คน ({coveragePercent.toFixed(0)}% มีข้อมูล)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
