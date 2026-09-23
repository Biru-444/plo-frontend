// normalize รหัส PLO/CLO ("PLO 4", "plo4", "PLO ๔" ฯลฯ) ให้เป็นรูปแบบเดียวกันเสมอ ("PLO4") - พอร์ตกฎ
// เดียวกับ app/services/code_normalize.py (backend) เป็น JS ล้วนๆ - import ข้าม backend/frontend ไม่ได้
// ต้องคงสองไฟล์นี้ให้ตรงกันด้วยมือเสมอ ถ้าแก้กฎฝั่งใดฝั่งหนึ่งต้องแก้อีกฝั่งตามด้วย
//
// เกิดจากบั๊กจริง (2026-09-23) : มคอ.2 import เคยบันทึก PLO code เป็น "PLO 1".."PLO 9" (มีช่องว่าง) แต่
// มคอ.3 extraction (Gemini) คืนรหัสแบบไม่มีช่องว่างตามที่เอกสารต้นฉบับเขียนจริง เช่น "PLO4" - เทียบ exact
// string แล้วไม่ match ทำให้หน้าตรวจสอบ (AdminCourseImportMCO3.jsx) จับคู่ชิป PLO ไม่ติด
const THAI_DIGIT_TO_ARABIC = { "๐": "0", "๑": "1", "๒": "2", "๓": "3", "๔": "4", "๕": "5", "๖": "6", "๗": "7", "๘": "8", "๙": "9" };

export function normalizeCode(code) {
  if (!code) return "";
  const translated = code.replace(/[๐-๙]/g, (d) => THAI_DIGIT_TO_ARABIC[d]);
  return translated.replace(/\s+/g, "").toUpperCase();
}
