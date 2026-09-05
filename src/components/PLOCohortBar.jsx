import PLODonut from "./PLODonut.jsx";

const KEYWORD_MAX_LENGTH = 60;

function truncate(text, max) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

/**
 * Compact card showing average_achieved_percent (0-100) for one PLO across
 * a whole curriculum cohort, plus how many students actually achieved it.
 * Green when isAchieved, warm red otherwise. Clickable when isExpandable to
 * toggle a per-student breakdown table (rendered by the caller). Full
 * description is on a hover tooltip - only a short excerpt shows inline so
 * the card stays scannable.
 */
export default function PLOCohortBar({
  code,
  description,
  averagePercent,
  isAchieved,
  achievedStudentCount,
  totalStudents,
  achievedRatePercent,
  isExpandable = false,
  isExpanded = false,
  onToggle,
  // undefined (default) = ไม่ใช้ฟีเจอร์นี้เลย เหมือนพฤติกรรมเดิมของหน้า /dashboard - true/false ไว้เผื่อ
  // อนาคตอยากเน้น PLO ที่ YLO ปีนั้นคาดหวัง แต่ปัจจุบันยังไม่มีผู้เรียกส่งค่านี้มาจากที่ไหนเลย (ไม่มีหน้า
  // ไหน pass isExpectedThisYear แล้วตอนนี้ หลังรวมหน้า "ภาพรวม PLO"/"PLO เมื่อจบการศึกษา" เป็นหน้าเดียว)
  isExpectedThisYear,
}) {
  const pct = Math.max(0, Math.min(100, averagePercent));
  const expectationClass =
    isExpectedThisYear === undefined
      ? ""
      : isExpectedThisYear
      ? "expected-this-year"
      : "not-expected-this-year";

  function handleKeyDown(e) {
    if (!isExpandable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  }

  return (
    <div
      className={`plo-bar-row ${isAchieved ? "at-goal" : "at-risk"} ${isExpandable ? "expandable" : ""} ${expectationClass}`}
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
        <span className={`plo-badge ${isAchieved ? "achieved" : "not-achieved"}`}>
          {isAchieved ? "บรรลุ" : "ไม่บรรลุ"}
        </span>
        {isExpectedThisYear && <span className="plo-year-target-badge">เป้าหมายปีนี้</span>}
      </div>
      <p className="plo-keyword" title={description}>
        {truncate(description, KEYWORD_MAX_LENGTH)}
      </p>
      <div className="plo-bar-stats">
        {/* วงแหวนโชว์ achievedRatePercent (สัดส่วนคนบรรลุ) ให้สม่ำเสมอกับวงใหญ่ "0% นักศึกษาบรรลุ PLO
            ครบทุกข้อ" บนสุดของหน้า - สีระบุเองจาก isAchieved ที่ผู้เรียกคำนวณมาแล้ว (เกณฑ์ในระบบนี้คือ
            50% ไม่ใช่ 60% ที่ PLODonut ใช้เป็นค่า default ถ้าไม่ระบุสี) */}
        <PLODonut
          percent={achievedRatePercent}
          size={48}
          color={isAchieved ? "var(--color-green-700)" : "var(--color-red-700)"}
        />
        <div className="plo-bar-stats-text">
          <div className="plo-bar-percent">เฉลี่ย {pct.toFixed(1)}%</div>
          <div className="plo-cohort-subtitle">
            บรรลุ {achievedStudentCount} จาก {totalStudents} คน ({achievedRatePercent.toFixed(1)}%)
          </div>
        </div>
      </div>
    </div>
  );
}
