import PLODonut from "./PLODonut.jsx";

const PASS_THRESHOLD = 60;

/**
 * แถบสรุปด้านบนหน้าภาพรวม PLO - จำนวน PLO ที่บรรลุ (เทียบกับเกณฑ์ PASS_THRESHOLD) และค่าเฉลี่ย % รวม
 * ทุก PLO รับ achievements เป็น array ของ { achieved_percent, ... } ต่อ PLO 1 ข้อ
 */
export default function PLOSummaryStats({ achievements }) {
  const total = achievements.length;
  const achievedCount = achievements.filter((a) => a.achieved_percent >= PASS_THRESHOLD).length;
  const avgPercent =
    total === 0 ? 0 : achievements.reduce((sum, a) => sum + a.achieved_percent, 0) / total;

  return (
    <div className="plo-summary-stats">
      <div className="stat-tile">
        <span className="stat-value">
          {achievedCount}/{total}
        </span>
        <span className="stat-label">PLO ที่บรรลุ (เกณฑ์ {PASS_THRESHOLD}%)</span>
      </div>
      <div className="stat-tile stat-tile-donut">
        <PLODonut percent={total === 0 ? null : avgPercent} threshold={PASS_THRESHOLD} size={52} />
        <div>
          <span className="stat-value">{avgPercent.toFixed(1)}%</span>
          <span className="stat-label">ค่าเฉลี่ยรวมทุก PLO</span>
        </div>
      </div>
    </div>
  );
}
