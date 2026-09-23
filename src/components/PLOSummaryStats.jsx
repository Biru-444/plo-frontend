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
 *
 *          TASK-plo-denominator: "ค่าเฉลี่ยรวมทุก PLO" หารด้วย PLO ที่ has_data=true เท่านั้น (ไม่ใช่
 *          ทุกข้อ) เหตุผลเดียวกับตัวหารระดับรุ่นฝั่ง backend - นักศึกษาชั้นปีต้นที่ยังไม่ได้เรียนวิชาที่
 *          วัด PLO ส่วนใหญ่ไม่ควรถูกคิดเป็น "ได้ 0%" ในค่าเฉลี่ยของตัวเอง เป็น null (แสดง "ยังไม่มีข้อมูล")
 *          ถ้าไม่มี PLO ข้อไหนมีข้อมูลเลยสักข้อ "PLO ที่บรรลุ" ยังคงเทียบกับ PLO ทั้งหมดในหลักสูตรเหมือนเดิม
 *          (เป็นตัวชี้ความคืบหน้าโดยรวม ไม่ใช่ค่าเฉลี่ยที่ถูกลากลงจากข้อที่ยังไม่มีข้อมูล)
 */
import PLODonut from "./PLODonut.jsx";

export default function PLOSummaryStats({ achievements }) {
  const total = achievements.length;
  const achievedCount = achievements.filter((a) => a.is_achieved).length;
  const withData = achievements.filter((a) => a.has_data !== false);
  const avgPercent =
    withData.length === 0
      ? null
      : withData.reduce((sum, a) => sum + a.achieved_percent, 0) / withData.length;

  return (
    <div className="plo-summary-stats">
      <div className="stat-tile">
        <span className="stat-value">
          {achievedCount}/{total}
        </span>
        <span className="stat-label">PLO ที่บรรลุ</span>
      </div>
      <div className="stat-tile stat-tile-donut">
        <PLODonut percent={avgPercent} size={52} />
        <div>
          <span className="stat-value">{avgPercent === null ? "ยังไม่มีข้อมูล" : `${avgPercent.toFixed(1)}%`}</span>
          <span className="stat-label">ค่าเฉลี่ยรวมทุก PLO ({withData.length}/{total} ข้อมีข้อมูล)</span>
        </div>
      </div>
    </div>
  );
}
