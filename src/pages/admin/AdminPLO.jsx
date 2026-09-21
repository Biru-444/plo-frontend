/**
 * ทำอะไร : หน้าจัดการ PLO (ผลลัพธ์การเรียนรู้ระดับหลักสูตร) — config ตาราง+ฟอร์มให้ CrudManager
 *          รับผิดชอบ UI ทั้งหมด หน้านี้เตรียมแค่ dropdown ตัวเลือกหลักสูตร (curriculumOptions)
 *
 * เชื่อมกับ : เรียก GET/POST/PUT/DELETE /plo ผ่าน api/client.js — route มาจาก App.jsx เส้นทาง
 *             "/admin/plo" (admin เท่านั้น)
 *
 * ถ้าแก้ : ลบ PLO จะ cascade ลบ ylo_plo_mapping และ course_plo ที่อ้างถึง กระทบทั้งการคำนวณ PLO และ
 *          YLO ที่ผูกกับ PLO นี้
 */
import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import { listCurricula, listPLO, createPLO, updatePLO, deletePLO } from "../../api/client.js";

// ตัวเลือก "ประเภท" ตายตัว 4 ปุ่มเสมอ + "อื่นๆ" พิมพ์เอง - ค่าที่เก็บจริงเป็นคำไทยล้วน (ไม่ใช่รหัส
// ภาษาอังกฤษ) ส่วนป้ายปุ่มโชว์ bilingual ให้ผู้ใช้เทียบศัพท์ได้
const PLO_CATEGORY_OPTIONS = [
  { value: "ความรู้", label: "ความรู้ (Knowledge)" },
  { value: "ทักษะ", label: "ทักษะ (Skills)" },
  { value: "จริยธรรม", label: "จริยธรรม (Ethics)" },
  { value: "ลักษณะบุคคล", label: "ลักษณะบุคคล (Character)" },
];
const PLO_OTHER_CATEGORY_VALUE = "__other__";

/**
 * ช่อง "ประเภท" ของฟอร์ม PLO - ปุ่มเลือกเดียว (pill) ตายตัว 4 ตัวเลือก + "อื่นๆ" เหมือน
 * CourseCategoryField ใน CurriculumCourses.jsx (ปุ่มหมวดหมู่ของวิชา) ทุกประการ ยกเว้นฟิลด์นี้บังคับ
 * เลือกเสมอ (ต่างจากหมวดหมู่วิชาที่ optional) - validation "ต้องเลือกก่อนบันทึก" อยู่ที่
 * CrudManager.buildPayload (ดู required: true ของ column นี้ด้านล่าง)
 *
 * ถ้าค่าเดิมตอนเปิดฟอร์มแก้ไขไม่ตรงกับ 4 ตัวเลือกแรกเป๊ะๆ (เช่นค่า backfill ตอน migration 'อื่นๆ' หรือ
 * ข้อความอิสระอื่น) ให้เริ่มที่โหมด "อื่นๆ" พร้อม prefill ค่าดิบเดิมในช่องพิมพ์ทันที - เช็คตอน mount
 * ครั้งเดียวพอ เพราะ modal ของ CrudManager unmount ทุกครั้งที่ปิด แล้ว mount ใหม่ทุกครั้งที่เปิด
 */
function PLOCategoryField({ value, onChange }) {
  const [isOther, setIsOther] = useState(
    () => value !== "" && !PLO_CATEGORY_OPTIONS.some((opt) => opt.value === value)
  );

  function handleSelect(selected) {
    if (selected === PLO_OTHER_CATEGORY_VALUE) {
      setIsOther(true);
      onChange(""); // เคลียร์ค่าเดิม (ที่ตรงกับตัวเลือกก่อนหน้า) กันค้างไว้เงียบๆ จนกว่าจะพิมพ์ใหม่
    } else {
      setIsOther(false);
      onChange(selected);
    }
  }

  const current = isOther ? PLO_OTHER_CATEGORY_VALUE : value;

  return (
    <>
      <div className="plo-filter-pills">
        {PLO_CATEGORY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`plo-filter-pill ${current === opt.value ? "active" : ""}`}
            onClick={() => handleSelect(opt.value)}
          >
            {opt.label}
          </button>
        ))}
        <button
          type="button"
          className={`plo-filter-pill ${current === PLO_OTHER_CATEGORY_VALUE ? "active" : ""}`}
          onClick={() => handleSelect(PLO_OTHER_CATEGORY_VALUE)}
        >
          อื่นๆ
        </button>
      </div>
      {isOther && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="พิมพ์ประเภทเอง"
          required
        />
      )}
    </>
  );
}

export default function AdminPLO() {
  // ตัวเลือกหลักสูตรสำหรับ dropdown ในฟอร์ม
  const [curriculumOptions, setCurriculumOptions] = useState([]);

  // โหลดรายชื่อหลักสูตรครั้งเดียวตอนเปิดหน้า
  useEffect(() => {
    listCurricula().then((data) =>
      setCurriculumOptions(data.map((c) => ({ value: c.id, label: `${c.name} (${c.year})` })))
    );
  }, []);

  const columns = [
    { key: "curriculum_id", label: "หลักสูตร", type: "select", options: curriculumOptions, required: true },
    { key: "code", label: "รหัส PLO (เช่น PLO1)", type: "text", required: true },
    { key: "description_th", label: "คำอธิบาย (ไทย)", type: "text", required: true },
    { key: "description_en", label: "คำอธิบาย (อังกฤษ)", type: "text", nullable: true },
    {
      key: "category",
      label: "ประเภท",
      type: "custom",
      required: true,
      render: (value, onChange) => <PLOCategoryField value={value} onChange={onChange} />,
    },
  ];

  return (
    <CrudManager
      title="จัดการ PLO"
      columns={columns}
      api={{ list: listPLO, create: createPLO, update: updatePLO, remove: deletePLO }}
    />
  );
}
