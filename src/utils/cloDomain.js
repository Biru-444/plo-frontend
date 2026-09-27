/**
 * ทำอะไร : ค่าคงที่ "ประเภท CLO" (โดเมนการเรียนรู้) — เก็บจริงในฟิลด์ clo.domain (Workstream 4)
 *          จำกัดแค่ 4 ค่าคงที่เท่านั้น ไม่มี "อื่นๆ" พิมพ์เอง (ต่างจาก PLO_CATEGORY_OPTIONS ใน
 *          AdminPLO.jsx ที่มีช่องอิสระ) เพราะ backend เก็บเป็น Literal ปิดตาย ดู app/schemas/clo.py
 *
 * เชื่อมกับ : ใช้ที่ AdminCLO.jsx (ฟอร์ม/ตาราง "ประเภท") และ AdminCLOPLOMapping.jsx (ข้อความในกล่อง
 *             ยืนยันตอนเชื่อมประเภทไม่ตรงกัน) - CLO_DOMAIN_LABEL_TH เป็นแค่ป้ายแสดงผล ไม่ใช่ตัวตัดสิน
 *             mismatch (การตัดสินยังมาจาก backend's GET /clo-plo-mapping/domain-check เท่านั้น - ดู
 *             app/services/domain_category_check.py::DOMAIN_TO_CATEGORY_TH ที่ป้ายนี้ mirror ค่ามา)
 *
 * ถ้าแก้ : ห้ามเพิ่มค่าที่ 5 หรือช่องอิสระ เว้นแต่จะขยาย CLODomain (Literal) ฝั่ง backend ก่อน
 */
export const CLO_DOMAIN_OPTIONS = [
  { value: "knowledge", label: "ความรู้ (Knowledge)" },
  { value: "skills", label: "ทักษะ (Skills)" },
  { value: "ethics", label: "จริยธรรม (Ethics)" },
  { value: "character", label: "ลักษณะบุคคล (Character)" },
];

export const CLO_DOMAIN_LABEL_TH = {
  knowledge: "ความรู้",
  skills: "ทักษะ",
  ethics: "จริยธรรม",
  character: "ลักษณะบุคคล",
};
