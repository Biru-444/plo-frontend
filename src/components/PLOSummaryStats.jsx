/**
 * ทำอะไร : สรุปตัวเลข 2 ก้อนของผลบรรลุ PLO ทั้งหมดของนักศึกษา 1 คน (ใช้ในหน้า /student-plo) -
 *          "PLO ที่บรรลุ" (นับจำนวน) กับ "ค่าเฉลี่ยรวมทุก PLO" (วงแหวน %)
 *
 * เชื่อมกับ : รับ achievements array ตรงๆ (plo_achievements จาก GET /plo/achievement) ไม่ fetch เอง
 *
 * ถ้าแก้ : PASS_THRESHOLD (60%) ใช้แค่คำนวณ "PLO ที่บรรลุ" ของ component นี้เท่านั้น ไม่ใช่เกณฑ์ที่
 *          backend ใช้ตัดสิน is_achieved จริง (achieved_percent เป็น 100/0 อยู่แล้วจาก backend
 *          all-or-nothing model - threshold นี้แค่เผื่อกรณีโมเดลเปลี่ยนเป็นค่าต่อเนื่องในอนาคต)
 */
import PLODonut from "./PLODonut.jsx";

const PASS_THRESHOLD = 60;

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
