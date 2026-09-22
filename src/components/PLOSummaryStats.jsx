/**
 * ทำอะไร : สรุปตัวเลข 2 ก้อนของผลบรรลุ PLO ทั้งหมดของนักศึกษา 1 คน (ใช้ในหน้า /student-plo) -
 *          "PLO ที่บรรลุ" (นับจำนวน) กับ "ค่าเฉลี่ยรวมทุก PLO" (วงแหวน %)
 *
 * เชื่อมกับ : รับ achievements array ตรงๆ (plo_achievements จาก GET /plo/achievement) ไม่ fetch เอง
 *
 * ถ้าแก้ : "PLO ที่บรรลุ" นับจาก a.is_achieved ที่ backend ตัดสินมาให้ตรงๆ (ไม่คำนวณ threshold ซ้ำเอง
 *          ฝั่งนี้ - เดิมเคยมี PASS_THRESHOLD ท้องถิ่นไว้เผื่อกรณีโมเดลเปลี่ยนเป็นค่าต่อเนื่อง ตอนนี้
 *          Workstream 3 เปลี่ยนแล้วจริง (achieved_percent ต่อเนื่อง 0-100) จึงตัดออกให้เหลือแหล่งความ
 *          จริงเดียว คือ PLO_ACHIEVEMENT_THRESHOLD_PERCENT ใน plo_calculation.py กันสองค่านี้ drift
 *          ไม่ตรงกันในอนาคต) PLODonut ยังรับ threshold=60 (ค่า default ของมันเอง) ไว้แค่กำหนดสี
 *          เขียว/แดงของวงแหวนเฉลี่ยเท่านั้น
 */
import PLODonut from "./PLODonut.jsx";

export default function PLOSummaryStats({ achievements }) {
  const total = achievements.length;
  const achievedCount = achievements.filter((a) => a.is_achieved).length;
  const avgPercent =
    total === 0 ? 0 : achievements.reduce((sum, a) => sum + a.achieved_percent, 0) / total;

  return (
    <div className="plo-summary-stats">
      <div className="stat-tile">
        <span className="stat-value">
          {achievedCount}/{total}
        </span>
        <span className="stat-label">PLO ที่บรรลุ</span>
      </div>
      <div className="stat-tile stat-tile-donut">
        <PLODonut percent={total === 0 ? null : avgPercent} size={52} />
        <div>
          <span className="stat-value">{avgPercent.toFixed(1)}%</span>
          <span className="stat-label">ค่าเฉลี่ยรวมทุก PLO</span>
        </div>
      </div>
    </div>
  );
}
