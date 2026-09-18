/**
 * ทำอะไร : หน้าเชื่อมโยงงานประเมิน (assessment item) เข้ากับ CLO พร้อมกำหนดน้ำหนัก — config
 *          ตาราง+ฟอร์มให้ CrudManager รับผิดชอบ UI ถือเป็นจุดตั้งค่าสำคัญของสูตรคำนวณ mastery
 *
 * เชื่อมกับ : เรียก GET/POST/PUT/DELETE /item-clo ผ่าน api/client.js — route มาจาก App.jsx เส้นทาง
 *             "/admin/item-clo" (admin เท่านั้น) backend เช็คเองว่าน้ำหนักรวมต่อ CLO ไม่เกิน 100%
 *             (ดู _other_mappings_weight_sum ใน routes/item_clo.py)
 *
 * ถ้าแก้ : weight_percent ที่ตั้งที่นี่คือตัวถ่วงน้ำหนักในสูตรคำนวณ CLO mastery ของนักศึกษาทุกคน
 */
import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listAssessmentItems,
  listCLO,
  listCourses,
  listCourseOfferings,
  listItemCLO,
  createItemCLO,
  updateItemCLO,
  deleteItemCLO,
} from "../../api/client.js";

export default function AdminItemCLO() {
  // ตัวเลือกงานประเมิน/CLO สำหรับ dropdown ในฟอร์ม (label ประกอบบริบทวิชา/ภาคเรียนให้แยกออกจากกันง่าย)
  const [itemOptions, setItemOptions] = useState([]);
  const [cloOptions, setCloOptions] = useState([]);

  // โหลดข้อมูลมาประกอบ label ที่อ่านง่ายครั้งเดียวตอนเปิดหน้า (2 กลุ่ม request แยกกัน ไม่รอกัน)
  useEffect(() => {
    Promise.all([listCLO(), listCourses()]).then(([clos, courses]) => {
      const courseById = {};
      courses.forEach((c) => (courseById[c.id] = c));
      setCloOptions(
        clos.map((c) => {
          const course = courseById[c.course_id];
          const courseLabel = course ? `${course.course_code} ${course.name_th}` : `วิชา #${c.course_id}`;
          return { value: c.id, label: `${c.code} - ${courseLabel}` };
        })
      );
    });

    // ชื่องานประเมิน (เช่น "สอบกลางภาค") ซ้ำกันได้หลายวิชา - ต้องต่อท้ายด้วยชื่อวิชา/ภาคเรียน
    // ไม่งั้นเลือกผิดวิชาได้ง่ายมากตอนมีงานประเมินเยอะๆ ทั้งระบบ
    Promise.all([listAssessmentItems(), listCourseOfferings(), listCourses()]).then(
      ([items, offerings, courses]) => {
        const courseById = {};
        courses.forEach((c) => (courseById[c.id] = c));
        const offeringById = {};
        offerings.forEach((o) => (offeringById[o.id] = o));
        setItemOptions(
          items.map((i) => {
            const offering = offeringById[i.offering_id];
            const course = offering ? courseById[offering.course_id] : null;
            const context = course
              ? `${course.course_code} ${course.name_th} · ${offering.semester}/${offering.academic_year} หมู่ ${offering.section}`
              : `วิชา #${i.offering_id}`;
            return { value: i.id, label: `${i.name} — ${context}` };
          })
        );
      }
    );
  }, []);

  const columns = [
    { key: "item_id", label: "งานประเมิน", type: "select", options: itemOptions, required: true },
    { key: "clo_id", label: "CLO (ผลลัพธ์ระดับรายวิชา)", type: "select", options: cloOptions, required: true },
    { key: "weight_percent", label: "น้ำหนัก (%)", type: "number", min: 0, max: 100, required: true },
  ];

  return (
    <CrudManager
      title="เชื่อมโยงงานประเมินกับ CLO"
      columns={columns}
      api={{ list: listItemCLO, create: createItemCLO, update: updateItemCLO, remove: deleteItemCLO }}
    />
  );
}
