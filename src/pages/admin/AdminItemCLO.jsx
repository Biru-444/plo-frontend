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
  const [itemOptions, setItemOptions] = useState([]);
  const [cloOptions, setCloOptions] = useState([]);

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
