/**
 * Horizontal bar showing achieved_percent (0-100) for one PLO.
 * Green when is_achieved, amber otherwise.
 */
export default function PLOBar({ code, description, achievedPercent, isAchieved }) {
  const pct = Math.max(0, Math.min(100, achievedPercent));

  return (
    <div className="plo-bar-row">
      <div className="plo-bar-header">
        <span className="plo-code">{code}</span>
        <span className="plo-description">{description}</span>
        <span className={`plo-badge ${isAchieved ? "achieved" : "not-achieved"}`}>
          {isAchieved ? "บรรลุ" : "ไม่บรรลุ"}
        </span>
      </div>
      <div className="plo-bar-track">
        <div
          className={`plo-bar-fill ${isAchieved ? "achieved" : "not-achieved"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="plo-bar-percent">{pct.toFixed(1)}%</div>
    </div>
  );
}
