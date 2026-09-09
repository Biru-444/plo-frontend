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

// ช่วง % บรรลุ - หมายเหตุ: ภายใต้กติกาปัจจุบัน (all-or-nothing ทั้ง PLO และ YLO ต่อนักศึกษา 1 คน)
// achieved_percent มีค่าได้แค่ 0 หรือ 100 เท่านั้น ช่วง 1-49%/50-99% จึงจะไม่มีผลลัพธ์เลยเสมอในทางปฏิบัติ
// ทุกวันนี้ - คงตัวเลือกไว้ให้ครบตามที่ขอ (ไม่เสียหายอะไร) เผื่ออนาคตกติกาการคำนวณเปลี่ยนเป็นแบบ partial
export const PERCENT_BUCKET_OPTIONS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "0", label: "0%" },
  { value: "1-49", label: "1–49%" },
  { value: "50-99", label: "50–99%" },
  { value: "100", label: "100%" },
];

export function matchesPercentBucket(percent, bucket) {
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
];

export function matchesAchievementStatus(isAchieved, status) {
  if (status === "achieved") return isAchieved === true;
  if (status === "not-achieved") return isAchieved === false;
  return true; // "all"
}

// ชั้นปีมี 4 ระดับเสมอตามโครงสร้างหลักสูตร (สมมติฐานเดียวกับที่ใช้อยู่แล้วทั่วระบบ - ดู
// YLOYearProgress.jsx/ylo_calculation.py)
export const YEAR_LEVEL_OPTIONS = [1, 2, 3, 4];

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
 * comparator ทั่วไปสำหรับแถวที่มี { studentId, studentName, achievedPercent? } - ใช้ได้ทั้งหน้า PLO/YLO
 * (มี achievedPercent) sortKey ที่ไม่มี field รองรับ (เช่น "percent-asc" ตอนไม่มี achievedPercent) จะ
 * fallback ไปเรียงตาม id แทนอย่างเงียบๆ ไม่ throw
 */
export function compareStudentRows(a, b, sortKey) {
  switch (sortKey) {
    case "percent-asc":
      return (a.achievedPercent ?? 0) - (b.achievedPercent ?? 0);
    case "percent-desc":
      return (b.achievedPercent ?? 0) - (a.achievedPercent ?? 0);
    case "name":
      return (a.studentName ?? "").localeCompare(b.studentName ?? "", "th");
    case "year":
      return (a.yearLevel ?? 0) - (b.yearLevel ?? 0);
    case "id":
    default:
      return Number(a.studentId) - Number(b.studentId);
  }
}
