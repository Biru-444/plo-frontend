import { Info } from "lucide-react";

/**
 * แทนที่ PLORadarChart ในหน้า /student-plo - การบรรลุ PLO ต่อนักศึกษา 1 คนเป็น all-or-nothing (0%
 * หรือ 100% เท่านั้น ไม่มีค่ากลาง) radar chart เลยเหลือแค่จุดแตะขอบ/กลางวง ให้ข้อมูลน้อยกว่าตาราง chip
 * ตรงๆ แถมกินพื้นที่แนวตั้งสูงมาก - ตัดสินใจร่วมกับผู้ใช้ 2026-09-08 ให้ตัดออกไปเลย ไม่ใช่แค่ย่อขนาด
 *
 * แต่ละ chip กดได้ (toggle - กดซ้ำ = ยกเลิกตัวกรอง) เพื่อกรองรายวิชาฝั่ง StudentYearBreakdown ให้เหลือ
 * เฉพาะวิชาที่เป็น primary ของ PLO ข้อนั้น (ดู courseToPlos ที่ PLOAchievement.jsx สร้างจาก
 * listCoursePLO()) คำอธิบายเต็มของ PLO ย้ายมาไว้ใน title tooltip ของไอคอน (i) แทนการกางข้อความเต็มไว้
 * ตลอด (ตามที่ตกลงกัน) - ใช้ native title attribute เหมือน PLOCourseBreakdown.jsx ทำอยู่แล้ว ไม่ต้องสร้าง
 * tooltip component ใหม่
 */
export default function PLOChipGrid({ achievements, selected, onSelect }) {
  return (
    <div className="plo-chip-grid">
      {achievements.map((plo) => {
        const isSelected = selected === plo.plo_code;
        return (
          <button
            key={plo.plo_id}
            type="button"
            className={`plo-chip ${plo.is_achieved ? "achieved" : "not-achieved"} ${
              isSelected ? "selected" : ""
            }`}
            onClick={() => onSelect(isSelected ? null : plo.plo_code)}
          >
            <span className="plo-chip-code">{plo.plo_code}</span>
            <Info size={12} className="plo-chip-info" title={plo.description} />
          </button>
        );
      })}
    </div>
  );
}
