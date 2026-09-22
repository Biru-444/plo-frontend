import { Info } from "lucide-react";

/**
 * แทนที่ PLORadarChart ในหน้า /student-plo - ตอนตัดสินใจทำหน้านี้ (2026-09-08) การบรรลุ PLO ยังเป็น
 * all-or-nothing (0% หรือ 100% เท่านั้น) radar chart เลยเหลือแค่จุดแตะขอบ/กลางวง ให้ข้อมูลน้อยกว่า
 * ตาราง chip ตรงๆ แถมกินพื้นที่แนวตั้งสูงมาก จึงตัดออกไปเลย ไม่ใช่แค่ย่อขนาด - Workstream 3 เปลี่ยน
 * achieved_percent เป็นค่าถ่วงน้ำหนักต่อเนื่องแล้ว (ไม่ใช่ 100/0 อีกต่อไป) แต่บทสรุปเรื่อง radar chart
 * ยังใช้ได้เหมือนเดิม (chip ยังกระชับกว่าและกรองวิชาได้ในตัว) แค่ต้องโชว์ตัวเลข % ด้วยแล้ว ไม่ใช่แค่สี
 * เขียว/แดง เพราะตอนนี้มีค่ากลางที่มีความหมายจริง (เช่น 45% vs 5% ทั้งคู่ "ยังไม่บรรลุ" แต่ต่างกันมาก)
 *
 * แต่ละ chip กดได้ (toggle - กดซ้ำ = ยกเลิกตัวกรอง) เพื่อกรองรายวิชาฝั่ง StudentYearBreakdown ให้เหลือ
 * เฉพาะวิชาที่มี CLO ผูกกับ PLO ข้อนั้น (ดู courseToPlos ที่ PLOAchievement.jsx สร้างจาก
 * listCLO()+listCLOPLOMapping()) คำอธิบายเต็มของ PLO ย้ายมาไว้ใน title tooltip ของไอคอน (i) แทนการกางข้อความเต็มไว้
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
            <span className="plo-chip-percent">{plo.achieved_percent.toFixed(0)}%</span>
            <Info size={12} className="plo-chip-info" title={plo.description} />
          </button>
        );
      })}
    </div>
  );
}
