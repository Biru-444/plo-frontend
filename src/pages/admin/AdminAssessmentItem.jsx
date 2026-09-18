/**
 * ทำอะไร : หน้าจัดการงานประเมิน (assessment item เช่น "สอบกลางภาค", "การบ้านที่ 3") config
 *          ตาราง+ฟอร์มให้ CrudManager รับผิดชอบ UI
 *
 * เชื่อมกับ : เรียก GET/POST/PUT/DELETE /assessment-items ผ่าน api/client.js — route มาจาก App.jsx
 *             เส้นทาง "/admin/assessment-items" (admin เท่านั้น)
 *
 * ถ้าแก้ : total_score (คะแนนเต็ม) ใช้เป็นตัวหารแปลงคะแนนดิบเป็น % ในทุกสูตรคำนวณ mastery ฝั่ง
 *          backend — แก้ค่านี้หลังมีการกรอกคะแนนแล้วจะกระทบ % ที่คำนวณได้ย้อนหลังทั้งหมด
 */
import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listCourseOfferings,
  listCourses,
  listAssessmentItems,
  createAssessmentItem,
  updateAssessmentItem,
  deleteAssessmentItem,
} from "../../api/client.js";

const TYPE_OPTIONS = [
  { value: "quiz", label: "แบบทดสอบย่อย (Quiz)" },
  { value: "midterm", label: "สอบกลางภาค (Midterm)" },
  { value: "final", label: "สอบปลายภาค (Final)" },
  { value: "assignment", label: "งานที่มอบหมาย (Assignment)" },
  { value: "project", label: "โปรเจกต์ (Project)" },
];

export default function AdminAssessmentItem() {
  // ตัวเลือกวิชาที่เปิดสอน (offering) สำหรับ dropdown — label ประกอบชื่อวิชา+ภาคเรียน+หมู่ เพื่อแยก
  // offering ที่ชื่อวิชาเดียวกันแต่คนละภาคเรียน/หมู่ออกจากกันให้ชัดเจน
  const [offeringOptions, setOfferingOptions] = useState([]);

  // โหลด offering + course มาประกอบ label ที่อ่านง่าย (ไม่ใช้แค่ id) ครั้งเดียวตอนเปิดหน้า
  useEffect(() => {
    Promise.all([listCourseOfferings(), listCourses()]).then(([offerings, courses]) => {
      const courseById = {};
      courses.forEach((c) => (courseById[c.id] = c));
      setOfferingOptions(
        offerings.map((o) => {
          const course = courseById[o.course_id];
          const courseLabel = course ? `${course.course_code} ${course.name_th}` : `วิชา #${o.course_id}`;
          return {
            value: o.id,
            label: `${courseLabel} · ภาคเรียน ${o.semester}/${o.academic_year} หมู่ ${o.section}`,
          };
        })
      );
    });
  }, []);

  const columns = [
    { key: "offering_id", label: "วิชาที่เปิดสอน", type: "select", options: offeringOptions, required: true },
    { key: "name", label: "ชื่องาน", type: "text", required: true },
    { key: "type", label: "ประเภท", type: "select", options: TYPE_OPTIONS, required: true },
    { key: "total_score", label: "คะแนนเต็ม", type: "number", min: 1, required: true },
  ];

  return (
    <CrudManager
      title="จัดการงานประเมิน"
      columns={columns}
      api={{
        list: listAssessmentItems,
        create: createAssessmentItem,
        update: updateAssessmentItem,
        remove: deleteAssessmentItem,
      }}
    />
  );
}
