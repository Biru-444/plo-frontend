import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import {
  listCourses,
  listUsers,
  listCourseOfferings,
  createCourseOffering,
  updateCourseOffering,
  deleteCourseOffering,
} from "../../api/client.js";

export default function AdminCourseOffering() {
  const [courseOptions, setCourseOptions] = useState([]);
  const [instructorOptions, setInstructorOptions] = useState([]);

  useEffect(() => {
    listCourses().then((data) =>
      setCourseOptions(data.map((c) => ({ value: c.id, label: `${c.course_code} ${c.name_th}` })))
    );
    listUsers().then((data) =>
      setInstructorOptions(
        data
          .filter((u) => u.role === "instructor")
          .map((u) => ({ value: u.id, label: `${u.first_name} ${u.last_name} (${u.username})` }))
      )
    );
  }, []);

  const columns = [
    {
      key: "course_id",
      label: "รายวิชา",
      type: "searchable-select",
      options: courseOptions,
      required: true,
      // ใช้ searchable-select เพราะรายวิชามีจำนวนมาก (49 วิชาในระบบตอนตรวจสอบ) พิมพ์กรองด้วย
      // รหัส/ชื่อวิชาสะดวกกว่าเลื่อนหา <select> ธรรมดา - อีก 3 dropdown filter ในหน้านี้ (ผู้สอน,
      // รุ่นปีเข้า, ปีการศึกษา) มีตัวเลือกน้อย (5/5/4 รายการตามลำดับ) จึงคงเป็น <select> ปกติไว้
    },
    {
      key: "instructor_id",
      label: "ผู้สอน",
      type: "select",
      options: instructorOptions,
      required: false,
      nullable: true,
      // เว้นว่างได้ตั้งใจ = ยังไม่มีผู้สอน รอให้อาจารย์มา "จับจอง" วิชานี้เองที่หน้าหลักของอาจารย์
    },
    { key: "cohort_year", label: "รุ่นปีเข้า (cohort_year)", type: "number", nullable: true, filterable: true },
    { key: "academic_year", label: "ปีการศึกษา (academic_year)", type: "number", required: true, filterable: true },
    { key: "semester", label: "ภาคเรียน (semester)", type: "number", required: true, filterable: true },
    { key: "section", label: "หมู่เรียน (section)", type: "text", required: true },
  ];

  const groupBy = {
    keys: ["academic_year", "semester"],
    label: (v) => `ปีการศึกษา ${v.academic_year} · ภาคเรียนที่ ${v.semester}`,
  };

  return (
    <CrudManager
      title="จัดการการเปิดสอนรายวิชา (Course Offering)"
      columns={columns}
      groupBy={groupBy}
      api={{
        list: listCourseOfferings,
        create: createCourseOffering,
        update: updateCourseOffering,
        remove: deleteCourseOffering,
      }}
    />
  );
}
