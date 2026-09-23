/**
 * ทำอะไร : หน้าจัดการนักศึกษา (เพิ่ม/แก้ไข/ลบ) — config ตาราง+ฟอร์มให้ CrudManager รับผิดชอบ UI
 *
 * เชื่อมกับ : เรียก GET/POST/PUT/DELETE /students ผ่าน api/client.js — route มาจาก App.jsx เส้นทาง
 *             "/admin/students" (admin เท่านั้น) ปกติข้อมูลนักศึกษาส่วนใหญ่จะเข้ามาทาง
 *             AdminRosterImport.jsx (นำเข้าไฟล์จากมหาวิทยาลัย) มากกว่าพิมพ์เพิ่มทีละคนที่นี่
 *
 * ถ้าแก้ : field "id" (รหัสนักศึกษา) เป็น readOnly หลังสร้างแล้ว (primary key แก้ไม่ได้) — ไม่มีฟอร์ม
 *          กรอกชั้นปีปัจจุบันแล้ว (คำนวณสดจาก cohort_year เสมอ ตั้งไม่ได้โดยตรง - ดู
 *          app/services/year_level.py ฝั่ง backend)
 */
import { useEffect, useState } from "react";
import CrudManager from "../../components/admin/CrudManager.jsx";
import { listCurricula, listStudents, createStudent, updateStudent, deleteStudent } from "../../api/client.js";

export default function AddStudent() {
  // ตัวเลือกหลักสูตรสำหรับ dropdown ในฟอร์ม
  const [curriculumOptions, setCurriculumOptions] = useState([]);

  // โหลดรายชื่อหลักสูตรครั้งเดียวตอนเปิดหน้า
  useEffect(() => {
    listCurricula().then((data) =>
      setCurriculumOptions(data.map((c) => ({ value: c.id, label: `${c.name} (${c.year})` })))
    );
  }, []);

  const columns = [
    { key: "id", label: "รหัสนักศึกษา", type: "text", required: true, readOnly: true },
    { key: "curriculum_id", label: "หลักสูตร", type: "select", options: curriculumOptions, required: true },
    { key: "first_name", label: "ชื่อ", type: "text", required: true },
    { key: "last_name", label: "นามสกุล", type: "text", required: true },
    {
      key: "title",
      label: "คำนำหน้า",
      type: "select",
      nullable: true,
      options: [
        { value: "นาย", label: "นาย" },
        { value: "นางสาว", label: "นางสาว" },
        { value: "นาง", label: "นาง" },
      ],
    },
    {
      key: "status",
      label: "สถานะการศึกษา",
      type: "select",
      required: true,
      options: [
        { value: "กำลังศึกษา", label: "กำลังศึกษา" },
        { value: "ลาออก", label: "ลาออก" },
        { value: "พักการเรียน", label: "พักการเรียน" },
        { value: "จบการศึกษา", label: "จบการศึกษา" },
      ],
    },
    { key: "cohort_year", label: "ปีที่เข้าศึกษา", type: "number", min: 0, required: true, filterable: true },
    { key: "section", label: "หมู่", type: "text", nullable: true, filterable: true },
  ];

  return (
    <CrudManager
      title="จัดการนักศึกษา"
      columns={columns}
      api={{ list: listStudents, create: createStudent, update: updateStudent, remove: deleteStudent }}
    />
  );
}
