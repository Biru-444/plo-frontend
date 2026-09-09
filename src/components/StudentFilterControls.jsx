import { Search } from "lucide-react";
import {
  ACHIEVEMENT_STATUS_OPTIONS,
  PERCENT_BUCKET_OPTIONS,
  YEAR_LEVEL_OPTIONS,
} from "../utils/studentFilters.js";

/**
 * ชิ้นส่วน UI ตัวกรอง/เรียงลำดับนักศึกษาที่ใช้ร่วมกันทั้ง 3 หน้า (ภาพรวม PLO, YLO ตามชั้นปี, รายชื่อ
 * นักศึกษา) ตามที่ตกลงกัน 2026-09-09 - แต่ละหน้าประกอบชิ้นเหล่านี้ตามชุดตัวกรองที่ตัวเองต้องการ (หน้า
 * รายชื่อนักศึกษาไม่ใช้ AchievementStatusFilter/PercentRangeFilter เพราะไม่มีข้อมูลผลบรรลุ) ใช้ class
 * .plo-cohort-prefix-filter เดียวกับตัวกรอง "เลือกรุ่น" ที่มีอยู่แล้วเพื่อความสอดคล้องของหน้าตา
 */

export function StudentSearchBox({ value, onChange, placeholder = "ค้นหารหัส/ชื่อนักศึกษา..." }) {
  return (
    <div className="toolbar-search">
      <Search size={16} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}

export function AchievementStatusFilter({ value, onChange }) {
  return (
    <label className="plo-cohort-prefix-filter">
      สถานะบรรลุ
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {ACHIEVEMENT_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PercentRangeFilter({ value, onChange }) {
  return (
    <label className="plo-cohort-prefix-filter">
      % บรรลุ
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {PERCENT_BUCKET_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// value: number (1-4) หรือ null = "ทั้งหมด"
export function YearLevelFilter({ value, onChange, label = "ชั้นปีปัจจุบัน" }) {
  return (
    <label className="plo-cohort-prefix-filter">
      {label}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">ทั้งหมด</option>
        {YEAR_LEVEL_OPTIONS.map((year) => (
          <option key={year} value={year}>
            ปี {year}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SortSelect({ value, onChange, options }) {
  return (
    <label className="plo-cohort-prefix-filter">
      เรียงตาม
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
