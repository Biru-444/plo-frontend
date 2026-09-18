/**
 * ทำอะไร : หน้าจัดการการเปิดสอนรายวิชา (course offering — วิชาหนึ่งในปี/เทอม/หมู่หนึ่ง) config
 *          ตาราง+ฟอร์มให้ CrudManager รับผิดชอบ UI จัดกลุ่มแถวตามปีการศึกษา+ภาคเรียน (groupBy)
 *
 * เชื่อมกับ : เรียก GET/POST/PUT/DELETE /course-offerings ผ่าน api/client.js — route มาจาก App.jsx
 *             เส้นทาง "/admin/course-offerings" (admin เท่านั้น) — instructor_id เว้นว่างได้ตั้งใจ
 *             (ดูคอมเมนต์ที่ column ด้านล่าง)
 *
 * ถ้าแก้ : ลบ offering จะ cascade ลบ enrollment/assessment_item ที่อ้างถึงไปด้วยทั้งหมด
 */
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
  // ตัวเลือกรายวิชา/ผู้สอนสำหรับ dropdown ในฟอร์ม
  const [courseOptions, setCourseOptions] = useState([]);
  const [instructorOptions, setInstructorOptions] = useState([]);

  // โหลดรายวิชาและผู้ใช้ (กรองเหลือเฉพาะ role=instructor) ครั้งเดียวตอนเปิดหน้า
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
      // รายวิชามีจำนวนมาก (49 วิชาในระบบตอนตรวจสอบ) พิมพ์กรองด้วยรหัส/ชื่อวิชาสะดวกกว่าเลื่อนหา
    },
    {
      key: "instructor_id",
      label: "ผู้สอน",
      type: "searchable-select",
      options: instructorOptions,
      required: false,
      nullable: true,
      // เว้นว่างได้ตั้งใจ = ยังไม่มีผู้สอน รอให้อาจารย์มา "จับจอง" วิชานี้เองที่หน้าหลักของอาจารย์
      // ตัวเลือกมีไม่เยอะ (5 คน) แต่เปลี่ยนเป็น searchable-select เพื่อความสม่ำเสมอกับ dropdown อื่น
    },
    {
      key: "cohort_year",
      label: "รุ่นปีเข้า",
      type: "number",
      min: 0,
      nullable: true,
      filterable: true,
      // ยังคง type "number" ไว้ (ฟอร์มเพิ่ม/แก้ไขพิมพ์ตัวเลขได้อิสระ ไม่จำกัดเฉพาะค่าที่เคยมี) แค่ให้
      // ช่องกรองด้านบนตารางเป็น searchable-select ผ่าน filterType (ดู jsdoc ของ CrudManager)
      filterType: "searchable-select",
    },
    {
      key: "academic_year",
      label: "ปีการศึกษา",
      type: "number",
      min: 0,
      required: true,
      filterable: true,
      filterType: "searchable-select",
    },
    {
      key: "semester",
      label: "ภาคเรียน",
      type: "number",
      min: 1,
      max: 3,
      required: true,
      filterable: true,
      filterType: "searchable-select",
    },
    { key: "section", label: "หมู่เรียน", type: "text", required: true },
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
