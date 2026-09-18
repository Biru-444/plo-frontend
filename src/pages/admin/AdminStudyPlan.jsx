/**
 * ทำอะไร : หน้าจัดการแผนการศึกษา (Study Plan — วิชาไหนสอนชั้นปี/เทอมไหน) config ตาราง+ฟอร์มให้
 *          CrudManager รับผิดชอบ UI จัดกลุ่มแถวตามชั้นปี+ภาคเรียนให้อ่านง่ายขึ้น (groupBy)
 *
 * เชื่อมกับ : เรียก GET/POST/PUT/DELETE /study-plan ผ่าน api/client.js — route มาจาก App.jsx
 *             เส้นทาง "/admin/study-plan" (admin เท่านั้น)
 *
 * ถ้าแก้ : ข้อมูลจากที่นี่ถูกอ่านโดย _study_plan_course_ids ใน ylo_calculation.py ฝั่ง backend เพื่อ
 *          ตัดสินว่าวิชาไหน "อยู่ในปีนี้" — แก้ปี/เทอมของวิชากระทบการคำนวณ YLO โดยตรง
 */
import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listCurricula,
  listCourses,
  listStudyPlan,
  createStudyPlan,
  updateStudyPlan,
  deleteStudyPlan,
} from "../../api/client.js";

export default function AdminStudyPlan() {
  // ตัวเลือกหลักสูตร/รายวิชาสำหรับ dropdown ในฟอร์ม
  const [curriculumOptions, setCurriculumOptions] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);

  // โหลดหลักสูตรและรายวิชาครั้งเดียวตอนเปิดหน้า (สอง request แยกกัน ไม่รอกัน)
  useEffect(() => {
    listCurricula().then((data) =>
      setCurriculumOptions(data.map((c) => ({ value: c.id, label: `${c.name} (${c.year})` })))
    );
    listCourses().then((data) =>
      setCourseOptions(data.map((c) => ({ value: c.id, label: `${c.course_code} ${c.name_th}` })))
    );
  }, []);

  const columns = [
    { key: "curriculum_id", label: "หลักสูตร", type: "select", options: curriculumOptions, required: true },
    { key: "course_id", label: "รายวิชา", type: "select", options: courseOptions, required: true },
    { key: "cohort_year", label: "รุ่นปีเข้า", type: "number", min: 0, nullable: true, filterable: true },
    { key: "year_level", label: "ชั้นปี", type: "number", min: 1, required: true, filterable: true },
    { key: "semester", label: "ภาคเรียน", type: "number", min: 1, max: 3, required: true, filterable: true },
  ];

  const groupBy = {
    keys: ["year_level", "semester"],
    label: (v) => `ชั้นปีที่ ${v.year_level} · ภาคเรียนที่ ${v.semester}`,
  };

  return (
    <CrudManager
      title="จัดการแผนการศึกษา (Study Plan)"
      columns={columns}
      groupBy={groupBy}
      api={{ list: listStudyPlan, create: createStudyPlan, update: updateStudyPlan, remove: deleteStudyPlan }}
    />
  );
}
