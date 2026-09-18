/**
 * ทำอะไร : หน้าจัดการรายวิชา (Course) — config ตาราง+ฟอร์มให้ CrudManager รับผิดชอบ UI ทั้งหมด
 *          หน้านี้เตรียมแค่ dropdown ตัวเลือกหลักสูตร (curriculumOptions)
 *
 * เชื่อมกับ : เรียก GET/POST/PUT/DELETE /courses ผ่าน api/client.js — route มาจาก App.jsx เส้นทาง
 *             "/admin/course" (admin เท่านั้น)
 *
 * ถ้าแก้ : ลบวิชาจะ cascade ลบ course_plo/study_plan/course_offering/clo ที่อ้างถึงไปด้วยทั้งหมด
 */
import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import { listCurricula, listCourses, createCourse, updateCourse, deleteCourse } from "../../api/client.js";

export default function AdminCourse() {
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
    { key: "course_code", label: "รหัสวิชา", type: "text", required: true },
    { key: "name_th", label: "ชื่อวิชา (ไทย)", type: "text", required: true },
    { key: "name_en", label: "ชื่อวิชา (อังกฤษ)", type: "text", nullable: true },
    { key: "credit", label: "หน่วยกิต", type: "number", min: 0, required: true },
    { key: "category", label: "หมวดวิชา", type: "text", nullable: true, filterable: true },
  ];

  return (
    <CrudManager
      title="จัดการรายวิชา"
      columns={columns}
      api={{ list: listCourses, create: createCourse, update: updateCourse, remove: deleteCourse }}
    />
  );
}
