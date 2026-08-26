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
  // undefined (default) = ไม่ใช้ฟีเจอร์นี้เลย เหมือนพฤติกรรมเดิมของหน้า /dashboard
  // true/false = หน้า /plo-by-year ใช้เน้น PLO ที่ YLO ปีนั้นคาดหวัง
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
      <div className="plo-bar-track">
        <div
          className={`plo-bar-fill ${isAchieved ? "achieved" : "not-achieved"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="plo-bar-percent">เฉลี่ย {pct.toFixed(1)}%</div>
      <div className="plo-cohort-subtitle">
        บรรลุ {achievedStudentCount} จาก {totalStudents} คน ({achievedRatePercent.toFixed(1)}%)
      </div>
    </div>
  );
}
