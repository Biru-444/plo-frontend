/**
 * ตรรกะกรอง/เรียงนักศึกษาที่ใช้ร่วมกันทั้ง 3 หน้า (ภาพรวม PLO, YLO ตามชั้นปี, รายชื่อนักศึกษา) ตามที่
 * ตกลงกัน 2026-09-09 - แยกออกมาเป็น utility เดียวแทนที่จะเขียนตรรกะ match/sort ซ้ำกันคนละแบบในแต่ละหน้า
 */

// ค้นหาแบบ case-insensitive substring - ผ่านถ้า query ว่างเปล่า (ไม่กรองอะไร) หรือมีอย่างน้อย 1 field ที่ตรง
export function matchesSearch(query, ...fields) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => (f ?? "").toLowerCase().includes(q));
}

// ช่วง % บรรลุ - ใช้ร่วมกันทั้งหน้า PLO (PLOStudentBreakdown.jsx) และ YLO (YLOStudentBreakdown.jsx)
// แต่สองอย่างนี้ไม่เหมือนกันแล้วตั้งแต่ Workstream 3: PLO เปลี่ยนเป็นคะแนนถ่วงน้ำหนักต่อเนื่อง (0-100
// จริง) ช่วง 1-49%/50-99% จึงมีผลลัพธ์จริงแล้ว - ส่วน YLO ยังเป็น all-or-nothing เหมือนเดิม (ไม่ได้
// เปลี่ยนตาม ดู ylo_calculation.py) achieved_percent ของ YLO เลยยังมีค่าได้แค่ 0 หรือ 100 เท่านั้น
export const PERCENT_BUCKET_OPTIONS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "0", label: "0%" },
  { value: "1-49", label: "1–49%" },
  { value: "50-99", label: "50–99%" },
  { value: "100", label: "100%" },
];

// hasData (TASK-plo-denominator): true/undefined = มีข้อมูล (ค่าเริ่มต้น - เข้ากันได้กับผู้เรียกที่ไม่มี
// แนวคิด has_data เลย เช่น YLOStudentBreakdown.jsx ที่ยังเป็น all-or-nothing ไม่ได้แก้ตาม task นี้) -
// คนไม่มีข้อมูล (hasData === false) ไม่เข้า bucket เปอร์เซ็นต์ไหนเลย (แม้แต่ "0%") เพราะ 0 ของเขาคือ
// "ยังไม่มีคะแนนให้ตัดสิน" ไม่ใช่ "ได้ 0% จริง"
export function matchesPercentBucket(percent, bucket, hasData = true) {
  if (bucket === "all") return true;
  if (hasData === false) return false;
  switch (bucket) {
    case "0":
      return percent === 0;
    case "1-49":
      return percent >= 1 && percent <= 49;
    case "50-99":
      return percent >= 50 && percent <= 99;
    case "100":
      return percent === 100;
    default:
      return true; // "all"
  }
}

export const ACHIEVEMENT_STATUS_OPTIONS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "achieved", label: "บรรลุแล้ว" },
  { value: "not-achieved", label: "ยังไม่บรรลุ" },
  { value: "no-data", label: "ยังไม่มีข้อมูล" },
];

// hasData (TASK-plo-denominator): ดูหมายเหตุเดียวกับ matchesPercentBucket - "ไม่บรรลุ" ต้องไม่รวมคนที่
// ไม่มีข้อมูล (เดิมนับปนกันเพราะ is_achieved ของคนไม่มีข้อมูลก็เป็น false เหมือนคนสอบตกจริง)
export function matchesAchievementStatus(isAchieved, status, hasData = true) {
  if (status === "no-data") return hasData === false;
  if (status === "achieved") return hasData !== false && isAchieved === true;
  if (status === "not-achieved") return hasData !== false && isAchieved === false;
  return true; // "all"
}

// ชั้นปีมี 4 ระดับเสมอตามโครงสร้างหลักสูตร (สมมติฐานเดียวกับที่ใช้อยู่แล้วทั่วระบบ - ดู
// YLOYearProgress.jsx/ylo_calculation.py) ตัวเลือกสุดท้าย (4) หมายถึง "4 หรือมากกว่า" - รวมนักศึกษาที่
// beyond_curriculum=true ด้วย (ดู current_year_level ของ backend ที่เปลี่ยนมาคำนวณสดจาก cohort_year
// แล้วไม่ clamp บนอีกต่อไป - อาจเกิน 4 ได้จริงถ้านักศึกษาเรียนเกินหลักสูตร)
export const YEAR_LEVEL_OPTIONS = [1, 2, 3, 4];

// ชั้นปี "สำหรับเทียบ/กรอง" ของนักศึกษา 1 คน (raw student object ที่มี current_year_level +
// beyond_curriculum จาก backend) - ต่างจากเลขจริงตรงที่ beyond_curriculum ถูก cap ไว้ที่ 4 เสมอ ให้ตรง
// กับตัวเลือกกรองสุดท้าย ("ปี 4+") ใน YEAR_LEVEL_OPTIONS
export function effectiveYearLevel(student) {
  return student.beyond_curriculum ? 4 : student.current_year_level;
}

// ข้อความแสดงผลชั้นปีของนักศึกษา 1 คน - "ปี 4+" ถ้าเกินหลักสูตรจริง (beyond_curriculum) แทนเลขจริงที่
// อาจดูแปลก (เช่น "ปี 7")
export function formatYearLevel(student) {
  return student.beyond_curriculum ? "ปี 4+" : `ปี ${student.current_year_level}`;
}

export const STUDENT_SORT_OPTIONS = [
  { value: "percent-asc", label: "% บรรลุ (น้อย → มาก)" },
  { value: "percent-desc", label: "% บรรลุ (มาก → น้อย)" },
  { value: "name", label: "ชื่อ ก-ฮ" },
  { value: "id", label: "รหัสนักศึกษา" },
];

export const ROSTER_SORT_OPTIONS = [
  { value: "id", label: "รหัสนักศึกษา" },
  { value: "name", label: "ชื่อ ก-ฮ" },
  { value: "year", label: "ปีที่เรียน" },
];

/**
 * comparator ทั่วไปสำหรับแถวที่มี { studentId, studentName, achievedPercent?, hasData? } - ใช้ได้ทั้ง
 * หน้า PLO/YLO (มี achievedPercent) sortKey ที่ไม่มี field รองรับ (เช่น "percent-asc" ตอนไม่มี
 * achievedPercent) จะ fallback ไปเรียงตาม id แทนอย่างเงียบๆ ไม่ throw - hasData (TASK-plo-denominator,
 * undefined = มีข้อมูล ค่าเริ่มต้นเข้ากันได้กับ YLO ที่ไม่มีแนวคิดนี้) : เรียงตาม % คนที่ไม่มีข้อมูลอยู่
 * ท้ายแถวเสมอไม่ว่าจะเรียง asc หรือ desc (0% จริงกับ "ไม่มีข้อมูล" ต้องแยกกันให้เห็นชัด ไม่ปนกันที่หัว/
 * ท้ายตารางแบบเดียวกับคนที่คะแนนต่ำสุด/สูงสุดจริง)
 */
export function compareStudentRows(a, b, sortKey) {
  if (sortKey === "percent-asc" || sortKey === "percent-desc") {
    const aHasData = a.hasData ?? true;
    const bHasData = b.hasData ?? true;
    if (aHasData !== bHasData) return aHasData ? -1 : 1;
    return sortKey === "percent-asc"
      ? (a.achievedPercent ?? 0) - (b.achievedPercent ?? 0)
      : (b.achievedPercent ?? 0) - (a.achievedPercent ?? 0);
  }
  switch (sortKey) {
    case "name":
      return (a.studentName ?? "").localeCompare(b.studentName ?? "", "th");
    case "year":
      return (a.yearLevel ?? 0) - (b.yearLevel ?? 0);
    case "id":
    default:
      return Number(a.studentId) - Number(b.studentId);
  }
}
